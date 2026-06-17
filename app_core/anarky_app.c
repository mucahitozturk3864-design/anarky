#define WIN32_LEAN_AND_MEAN

#include <winsock2.h>
#include <windows.h>
#include <shellapi.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <wchar.h>

#define REQ_BUFFER_SIZE 8192
#define PATH_BUFFER_SIZE 4096
#define FILE_CHUNK_SIZE 16384

static int g_no_browser = 0;
static volatile LONG g_running = 1;
static SOCKET g_server_socket = INVALID_SOCKET;

static void print_banner(int port) {
    printf("=========================================\n");
    printf("  ANARKY DAW - C DESKTOP APP LAUNCHER\n");
    printf("=========================================\n");
    printf("C Winsock static server started.\n");
    printf("URL: http://127.0.0.1:%d\n", port);
    printf("Close this window to stop the app.\n\n");
}

static const char* get_mime_type(const wchar_t* path) {
    const wchar_t* ext = wcsrchr(path, L'.');
    if (!ext) return "application/octet-stream";
    if (_wcsicmp(ext, L".html") == 0) return "text/html; charset=utf-8";
    if (_wcsicmp(ext, L".css") == 0) return "text/css; charset=utf-8";
    if (_wcsicmp(ext, L".js") == 0) return "application/javascript; charset=utf-8";
    if (_wcsicmp(ext, L".json") == 0) return "application/json; charset=utf-8";
    if (_wcsicmp(ext, L".png") == 0) return "image/png";
    if (_wcsicmp(ext, L".jpg") == 0 || _wcsicmp(ext, L".jpeg") == 0) return "image/jpeg";
    if (_wcsicmp(ext, L".gif") == 0) return "image/gif";
    if (_wcsicmp(ext, L".svg") == 0) return "image/svg+xml";
    if (_wcsicmp(ext, L".mp4") == 0) return "video/mp4";
    if (_wcsicmp(ext, L".wav") == 0) return "audio/wav";
    if (_wcsicmp(ext, L".ico") == 0) return "image/x-icon";
    return "application/octet-stream";
}

static int hex_value(char c) {
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return 10 + (c - 'a');
    if (c >= 'A' && c <= 'F') return 10 + (c - 'A');
    return -1;
}

static void url_decode_utf8(const char* in, char* out, size_t out_size) {
    size_t oi = 0;
    for (size_t i = 0; in[i] && oi + 1 < out_size; i++) {
        if (in[i] == '%' && in[i + 1] && in[i + 2]) {
            int h1 = hex_value(in[i + 1]);
            int h2 = hex_value(in[i + 2]);
            if (h1 >= 0 && h2 >= 0) {
                out[oi++] = (char)((h1 << 4) | h2);
                i += 2;
                continue;
            }
        }
        if (in[i] == '+') out[oi++] = ' ';
        else out[oi++] = in[i];
    }
    out[oi] = '\0';
}

static int utf8_to_wide(const char* utf8, wchar_t* wide, int wide_count) {
    int n = MultiByteToWideChar(CP_UTF8, 0, utf8, -1, wide, wide_count);
    return n > 0;
}

static int has_parent_traversal(const wchar_t* path) {
    if (wcsstr(path, L"..") != NULL) return 1;
    if (wcsstr(path, L":") != NULL) return 1;
    return 0;
}

static void make_file_path(const char* request_path, wchar_t* out_path, int out_count) {
    char clean_url[PATH_BUFFER_SIZE];
    char decoded_utf8[PATH_BUFFER_SIZE];
    wchar_t decoded_wide[PATH_BUFFER_SIZE];
    wchar_t root[PATH_BUFFER_SIZE];

    const char* path = request_path;
    if (path[0] == '/') path++;

    size_t len = 0;
    while (path[len] && path[len] != '?' && path[len] != '#'
           && len + 1 < sizeof(clean_url)) {
        clean_url[len] = path[len];
        len++;
    }
    clean_url[len] = '\0';

    if (clean_url[0] == '\0') {
        strcpy(clean_url, "index.html");
    }

    url_decode_utf8(clean_url, decoded_utf8, sizeof(decoded_utf8));
    if (!utf8_to_wide(decoded_utf8, decoded_wide, PATH_BUFFER_SIZE)) {
        decoded_wide[0] = L'\0';
    }

    for (wchar_t* p = decoded_wide; *p; p++) {
        if (*p == L'/') *p = L'\\';
    }

    GetCurrentDirectoryW(PATH_BUFFER_SIZE, root);
    if (has_parent_traversal(decoded_wide)) {
        swprintf(out_path, out_count, L"%ls\\__blocked__", root);
        return;
    }

    swprintf(out_path, out_count, L"%ls\\%ls", root, decoded_wide);
}

static void send_all(SOCKET client, const char* data, int length) {
    int sent = 0;
    while (sent < length) {
        int n = send(client, data + sent, length - sent, 0);
        if (n <= 0) return;
        sent += n;
    }
}

static void send_text_response(SOCKET client, int code, const char* status, const char* body) {
    char header[1024];
    int body_len = (int)strlen(body);
    int header_len = snprintf(
        header,
        sizeof(header),
        "HTTP/1.1 %d %s\r\n"
        "Content-Type: text/plain; charset=utf-8\r\n"
        "Content-Length: %d\r\n"
        "Connection: close\r\n\r\n",
        code,
        status,
        body_len
    );
    send_all(client, header, header_len);
    send_all(client, body, body_len);
}

static int parse_range_header(const char* request, long long file_size, long long* start, long long* end) {
    const char* range = strstr(request, "Range: bytes=");
    if (!range) range = strstr(request, "range: bytes=");
    if (!range) return 0;

    range += strlen("Range: bytes=");
    char* tail = NULL;
    long long first = _strtoi64(range, &tail, 10);
    if (tail == range || *tail != '-') return 0;

    tail++;
    long long last = file_size - 1;
    if (*tail != '\r' && *tail != '\n' && *tail != '\0') {
        char* end_tail = NULL;
        last = _strtoi64(tail, &end_tail, 10);
        if (end_tail == tail) return 0;
    }

    if (first < 0 || first >= file_size || last < first) return 0;
    if (last >= file_size) last = file_size - 1;

    *start = first;
    *end = last;
    return 1;
}

static void serve_file(SOCKET client, const wchar_t* file_path, int is_head, const char* request) {
    FILE* file = _wfopen(file_path, L"rb");
    if (!file) {
        send_text_response(client, 404, "Not Found", "404 - File not found");
        return;
    }

    _fseeki64(file, 0, SEEK_END);
    long long size = _ftelli64(file);
    _fseeki64(file, 0, SEEK_SET);

    const char* mime = get_mime_type(file_path);
    long long range_start = 0;
    long long range_end = size - 1;
    int has_range = parse_range_header(request, size, &range_start, &range_end);
    long long response_size = has_range ? (range_end - range_start + 1) : size;

    char header[1024];
    int header_len;
    if (has_range) {
        header_len = snprintf(
            header,
            sizeof(header),
            "HTTP/1.1 206 Partial Content\r\n"
            "Content-Type: %s\r\n"
            "Content-Length: %lld\r\n"
            "Content-Range: bytes %lld-%lld/%lld\r\n"
            "Accept-Ranges: bytes\r\n"
            "Cache-Control: no-cache\r\n"
            "Connection: close\r\n\r\n",
            mime,
            response_size,
            range_start,
            range_end,
            size
        );
        _fseeki64(file, range_start, SEEK_SET);
    } else {
        header_len = snprintf(
            header,
            sizeof(header),
            "HTTP/1.1 200 OK\r\n"
            "Content-Type: %s\r\n"
            "Content-Length: %lld\r\n"
            "Accept-Ranges: bytes\r\n"
            "Cache-Control: no-cache\r\n"
            "Connection: close\r\n\r\n",
            mime,
            response_size
        );
    }
    send_all(client, header, header_len);

    if (!is_head) {
        char buffer[FILE_CHUNK_SIZE];
        long long remaining = response_size;
        while (remaining > 0) {
            size_t want = remaining > FILE_CHUNK_SIZE ? FILE_CHUNK_SIZE : (size_t)remaining;
            size_t read_count = fread(buffer, 1, want, file);
            if (read_count == 0) break;
            send_all(client, buffer, (int)read_count);
            remaining -= (long long)read_count;
        }
    }

    fclose(file);
}

static void handle_client(SOCKET client) {
    char request[REQ_BUFFER_SIZE];
    int received = recv(client, request, sizeof(request) - 1, 0);
    if (received <= 0) {
        closesocket(client);
        return;
    }
    request[received] = '\0';

    char method[16] = {0};
    char path[PATH_BUFFER_SIZE] = {0};
    if (sscanf(request, "%15s %4095s", method, path) != 2) {
        send_text_response(client, 400, "Bad Request", "400 - Bad request");
        closesocket(client);
        return;
    }

    int is_head = (_stricmp(method, "HEAD") == 0);
    if (_stricmp(method, "GET") != 0 && !is_head) {
        send_text_response(client, 405, "Method Not Allowed", "405 - Use GET or HEAD");
        closesocket(client);
        return;
    }

    wchar_t file_path[PATH_BUFFER_SIZE];
    make_file_path(path, file_path, PATH_BUFFER_SIZE);
    serve_file(client, file_path, is_head, request);
    closesocket(client);
}

static SOCKET create_server_socket(int* port) {
    SOCKET server_socket = INVALID_SOCKET;

    for (int p = *port; p < *port + 20; p++) {
        server_socket = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
        if (server_socket == INVALID_SOCKET) return INVALID_SOCKET;

        int yes = 1;
        setsockopt(server_socket, SOL_SOCKET, SO_REUSEADDR, (const char*)&yes, sizeof(yes));

        struct sockaddr_in addr;
        memset(&addr, 0, sizeof(addr));
        addr.sin_family = AF_INET;
        addr.sin_addr.s_addr = inet_addr("127.0.0.1");
        addr.sin_port = htons((unsigned short)p);

        if (bind(server_socket, (struct sockaddr*)&addr, sizeof(addr)) == 0) {
            if (listen(server_socket, 16) == 0) {
                *port = p;
                return server_socket;
            }
        }

        closesocket(server_socket);
        server_socket = INVALID_SOCKET;
    }

    return INVALID_SOCKET;
}

static HANDLE launch_desktop_app_window(int port) {
    char url[256];
    char temp_path[MAX_PATH];
    char profile_path[MAX_PATH * 2];
    char parameters[1024];

    snprintf(url, sizeof(url), "http://127.0.0.1:%d", port);
    GetTempPathA(MAX_PATH, temp_path);
    snprintf(profile_path, sizeof(profile_path), "%sANARKY_DAW_EDGE_PROFILE", temp_path);
    CreateDirectoryA(profile_path, NULL);

    snprintf(
        parameters,
        sizeof(parameters),
        "--app=%s --window-size=1280,860 --user-data-dir=\"%s\"",
        url,
        profile_path
    );

    SHELLEXECUTEINFOA info;
    memset(&info, 0, sizeof(info));
    info.cbSize = sizeof(info);
    info.fMask = SEE_MASK_NOCLOSEPROCESS;
    info.lpVerb = "open";
    info.lpFile = "msedge.exe";
    info.lpParameters = parameters;
    info.nShow = SW_SHOWNORMAL;

    if (ShellExecuteExA(&info)) {
        return info.hProcess;
    }

    ShellExecuteA(NULL, "open", url, NULL, NULL, SW_SHOWNORMAL);
    return NULL;
}

static DWORD WINAPI server_thread(LPVOID arg) {
    (void)arg;
    while (InterlockedCompareExchange(&g_running, 1, 1)) {
        SOCKET client = accept(g_server_socket, NULL, NULL);
        if (client == INVALID_SOCKET) {
            continue;
        }
        handle_client(client);
    }
    return 0;
}

int main(int argc, char** argv) {
    int port = 8080;
    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--no-browser") == 0) {
            g_no_browser = 1;
        } else if (strcmp(argv[i], "--port") == 0 && i + 1 < argc) {
            port = atoi(argv[++i]);
            if (port <= 0) port = 8080;
        }
    }

    WSADATA wsa;
    if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) {
        printf("ERROR: WSAStartup failed.\n");
        return 1;
    }

    g_server_socket = create_server_socket(&port);
    if (g_server_socket == INVALID_SOCKET) {
        printf("ERROR: Could not start C HTTP server.\n");
        WSACleanup();
        return 1;
    }

    print_banner(port);

    if (g_no_browser) {
        while (1) {
            SOCKET client = accept(g_server_socket, NULL, NULL);
            if (client == INVALID_SOCKET) {
                continue;
            }
            handle_client(client);
        }
    } else {
        HANDLE thread = CreateThread(NULL, 0, server_thread, NULL, 0, NULL);
        HANDLE app_process = launch_desktop_app_window(port);

        if (app_process) {
            WaitForSingleObject(app_process, INFINITE);
            CloseHandle(app_process);
        } else {
            MessageBoxA(
                NULL,
                "ANARKY DAW app window acildi. Kapatmak icin bu mesaji kapatabilirsin.",
                "ANARKY DAW",
                MB_OK | MB_ICONINFORMATION
            );
        }

        InterlockedExchange(&g_running, 0);
        closesocket(g_server_socket);
        if (thread) {
            WaitForSingleObject(thread, 2000);
            CloseHandle(thread);
        }
    }

    closesocket(g_server_socket);
    WSACleanup();
    return 0;
}

# ANARKY DAW C Uygulamasi

Bu klasordeki `anarky_app.c`, web arayuzunu C ile calisan yerel bir Windows uygulama baslaticisina cevirir.

Program Winsock kullanarak `127.0.0.1` uzerinde statik HTTP sunucusu acar, `index.html`, CSS, JS, fotograflar, WAV ve MP4 dosyalarini C kodu ile servis eder. Ardindan Edge'i normal tarayici sekmesi olarak degil, adres cubugu olmayan ayri bir masaustu uygulama penceresi olarak baslatir.

## Derleme

```bat
gcc -Wall -Wextra -O2 app_core\anarky_app.c -o ANARKY_DAW_APP.exe -lws2_32 -mwindows
```

## Calistirma

```bat
ANARKY_DAW_APP.exe
```

Tek tikla derleyip calistirmak icin ana klasordeki `ANARKY_UYGULAMA_DERLE_CALISTIR.bat` dosyasi kullanilabilir.

## Opsiyonlar

```bat
ANARKY_DAW_APP.exe --port 8090
ANARKY_DAW_APP.exe --no-browser
```

Bu kisim projeyi C dersine daha uygun hale getirir: socket programlama, dosya okuma, pointer kullanimi, string islemleri, donguler, fonksiyonlar, bellek guvenligi ve HTTP cevap yapisi C tarafinda uygulanir.

#include <stdio.h>
#include <stdlib.h>
#include "wav_writer.h"

// Float formatından 16-bit tamsayı formatına (WAV standardı) dönüşüm
int write_wav_file(const char* filename, float* buffer, int frames, int sample_rate) {
    FILE* file = fopen(filename, "wb");
    if (!file) {
        printf("HATA: Dosya olusturulamadi (%s)\n", filename);
        return 0; // Basarisiz
    }

    int num_channels = 1;
    int bit_depth = 16;
    
    WavHeader header;
    // Header alanlarini doldurma
    header.riff_header[0] = 'R'; header.riff_header[1] = 'I'; header.riff_header[2] = 'F'; header.riff_header[3] = 'F';
    header.wave_header[0] = 'W'; header.wave_header[1] = 'A'; header.wave_header[2] = 'V'; header.wave_header[3] = 'E';
    header.fmt_header[0]  = 'f'; header.fmt_header[1]  = 'm'; header.fmt_header[2]  = 't'; header.fmt_header[3]  = ' ';
    header.data_header[0] = 'd'; header.data_header[1] = 'a'; header.data_header[2] = 't'; header.data_header[3] = 'a';
    
    header.fmt_chunk_size = 16;
    header.audio_format = 1; // PCM
    header.num_channels = num_channels;
    header.sample_rate = sample_rate;
    header.bit_depth = bit_depth;
    header.byte_rate = sample_rate * num_channels * (bit_depth / 8);
    header.sample_alignment = num_channels * (bit_depth / 8);
    header.data_bytes = frames * num_channels * (bit_depth / 8);
    header.wav_size = header.data_bytes + sizeof(WavHeader) - 8;

    // Header'i dosyaya yazma
    fwrite(&header, sizeof(WavHeader), 1, file);

    // Float ses verisini 16-bit PCM (short) formatina cevirip yazma
    short* pcm_data = (short*)malloc(frames * sizeof(short));
    for (int i = 0; i < frames; i++) {
        float sample = buffer[i];
        if (sample > 1.0f) sample = 1.0f;
        if (sample < -1.0f) sample = -1.0f;
        pcm_data[i] = (short)(sample * 32767.0f);
    }
    
    fwrite(pcm_data, sizeof(short), frames, file);
    
    free(pcm_data);
    fclose(file);
    
    printf("BASARILI: Ses dosyasi diske yazildi -> %s\n", filename);
    return 1;
}

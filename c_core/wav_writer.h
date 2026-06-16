#ifndef WAV_WRITER_H
#define WAV_WRITER_H

#include <stdint.h>

// WAV Dosya Başlığı (Header) Yapısı
typedef struct {
    char riff_header[4];      // "RIFF"
    uint32_t wav_size;        // Dosya boyutu
    char wave_header[4];      // "WAVE"
    char fmt_header[4];       // "fmt "
    uint32_t fmt_chunk_size;  // 16
    uint16_t audio_format;    // 1 (PCM)
    uint16_t num_channels;    // 1 (Mono) veya 2 (Stereo)
    uint32_t sample_rate;     // 48000 vb.
    uint32_t byte_rate;       // sample_rate * num_channels * bytes_per_sample
    uint16_t sample_alignment;// num_channels * bytes_per_sample
    uint16_t bit_depth;       // 16 (16-bit)
    char data_header[4];      // "data"
    uint32_t data_bytes;      // Ses verisi boyutu
} WavHeader;

// Fonksiyon prototipi
int write_wav_file(const char* filename, float* buffer, int frames, int sample_rate);

#endif

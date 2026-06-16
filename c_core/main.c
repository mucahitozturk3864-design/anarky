#include <stdio.h>
#include <stdlib.h>
#include "types.h"
#include "channel.h"
#include "effects.h"
#include "mixer.h"
#include "wav_writer.h"
#include "album_bst.h"
#include "filters.h"

int main() {
    printf("=========================================\n");
    printf("  ANARKY DAW v3.0 - ADVANCED C-CORE\n");
    printf("=========================================\n\n");
    
    // --- 1. BST (Binary Search Tree) Testi ---
    printf("[*] Album Veritabani (BST) Yukleniyor...\n");
    AlbumNode* db = NULL;
    db = insert_album(db, 2017, "DAMN. (Kendrick Lamar)", 2017);
    db = insert_album(db, 2000, "MMLP (Eminem)", 2000);
    db = insert_album(db, 2024, "Veritas (Mavi)", 2024);
    
    printf("    Arama Testi: 2000 yili -> ");
    AlbumNode* res = search_album_by_id(db, 2000);
    if (res) printf("Bulundu! Albüm: %s\n", res->title);
    else printf("Bulunamadi.\n");
    
    // --- 2. Ses Motoru & Filtreler Testi ---
    printf("\n[*] Ses Motoru Baslatiliyor...\n");
    AudioChannel* master_list = NULL;
    
    AudioChannel* synth_channel = create_channel(48000); // 1 saniyelik buffer
    synth_channel->gain = 0.8f;
    // Buffer'a yapay bir dalga dolduralım
    for (int i=0; i<48000; i++) synth_channel->buffer[i] = 0.5f;
    add_channel_to_mixer(&master_list, synth_channel);
    
    printf("[*] Filtre Uygulaniyor: Low-pass (IIR Convolution)...\n");
    LowPassFilter lpf;
    init_lowpass(&lpf, 0.1f);
    process_lowpass(&lpf, synth_channel->buffer, 48000);
    
    printf("[*] Ses Mikseri (Mixer) Calistiriliyor...\n");
    float* master_output = (float*)malloc(48000 * sizeof(float));
    mix_master_output(master_list, master_output, 48000);
    
    // --- 3. File I/O (Dosya Yazma) Testi ---
    printf("\n[*] WAV Dosyasi Diske Yaziliyor (File I/O)...\n");
    write_wav_file("output_test.wav", master_output, 48000, 48000);
    
    printf("\n[*] Bellek (Heap) Temizleniyor...\n");
    free_all_channels(master_list);
    free(master_output);
    free_album_tree(db);
    
    printf("\n>>> C Engine Tamamen Basarili! <<<\n");
    return 0;
}

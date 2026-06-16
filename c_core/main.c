#include <stdio.h>
#include <stdlib.h>
#include "types.h"
#include "channel.h"
#include "effects.h"
#include "mixer.h"

int main() {
    printf("=========================================\n");
    printf("  ANARKY DAW v2.0 - C-CORE DSP ENGINE\n");
    printf("=========================================\n\n");
    
    printf("[*] Ses Motoru Baslatiliyor...\n");
    
    AudioChannel* master_list = NULL;
    
    printf("[*] Kanal 1 (Beat) Olusturuluyor...\n");
    AudioChannel* beat_channel = create_channel(48000);
    beat_channel->gain = 0.8f;
    add_channel_to_mixer(&master_list, beat_channel);
    
    printf("[*] Kanal 2 (Vokal) Olusturuluyor...\n");
    AudioChannel* vocal_channel = create_channel(48000);
    vocal_channel->gain = 1.0f;
    add_channel_to_mixer(&master_list, vocal_channel);
    
    printf("[*] Efekt Uygulaniyor: Distortion (Kanal 2)...\n");
    VocalEffect fx = {"Distortion", 1, 1.5f, 0.0f, 1};
    apply_vocal_effect(vocal_channel, &fx, 48000);
    
    printf("[*] Ses Mikseri (Mixer) Calistiriliyor...\n");
    float* master_output = (float*)malloc(48000 * sizeof(float));
    mix_master_output(master_list, master_output, 48000);
    
    printf("[+] Islemler Basariyla Tamamlandi. Master Out [%.2f]\n", master_output[0]);
    
    printf("[*] Bellek (Heap) Temizleniyor...\n");
    free_all_channels(master_list);
    free(master_output);
    
    printf("\n>>> C Engine Testi Gecildi. <<<\n");
    
    return 0;
}

#include <stdio.h>
#include <stdlib.h>
#include "types.h"
#include "channel.h"
#include "effects.h"
#include "mixer.h"
#include "wav_writer.h"
#include "album_bst.h"
#include "filters.h"
#include "sequencer.h"
#include "analyzer.h"

#define SAMPLE_RATE 48000
#define FRAME_COUNT 48000

static void fill_pad_channel(AudioChannel* ch) {
    if (ch == NULL || ch->buffer == NULL) return;

    for (int i = 0; i < FRAME_COUNT; i++) {
        ch->buffer[i] = 0.35f;
    }
}

static void build_demo_pattern(StepSequencer* seq) {
    init_step_sequencer(seq, SAMPLE_RATE, 96.0f);

    set_step(seq, 0,  1, 0.95f, 55.0f);
    set_step(seq, 3,  1, 0.45f, 110.0f);
    set_step(seq, 4,  1, 0.80f, 73.4f);
    set_step(seq, 7,  1, 0.40f, 146.8f);
    set_step(seq, 8,  1, 0.95f, 55.0f);
    set_step(seq, 10, 1, 0.35f, 196.0f);
    set_step(seq, 12, 1, 0.75f, 82.4f);
    set_step(seq, 15, 1, 0.50f, 220.0f);
}

static AlbumNode* build_album_database(void) {
    AlbumNode* db = NULL;
    db = insert_album(db, 2017, "DAMN. (Kendrick Lamar)", 2017);
    db = insert_album(db, 2000, "MMLP (Eminem)", 2000);
    db = insert_album(db, 2024, "Veritas (Mavi)", 2024);
    db = insert_album(db, 2007, "Muptezhel (Ezhel)", 2017);
    db = insert_album(db, 2010, "Sandik (Hayko Cepkin)", 2010);
    return db;
}

int main() {
    printf("=========================================\n");
    printf("  ANARKY DAW v4.0 - C FOCUSED DSP CORE\n");
    printf("=========================================\n\n");

    printf("[1] Album veritabani (Binary Search Tree) yukleniyor...\n");
    AlbumNode* db = build_album_database();

    printf("    Arama testi: 2000 ID -> ");
    AlbumNode* res = search_album_by_id(db, 2000);
    if (res) printf("Bulundu: %s\n", res->title);
    else printf("Bulunamadi.\n");

    printf("\n[2] Ses kanallari heap uzerinde olusturuluyor...\n");
    AudioChannel* master_list = NULL;

    AudioChannel* pad_channel = create_channel(SAMPLE_RATE);
    AudioChannel* beat_channel = create_channel(SAMPLE_RATE);
    if (pad_channel == NULL || beat_channel == NULL) {
        printf("HATA: Ses kanali icin bellek ayrilamadi.\n");
        free_all_channels(pad_channel);
        free_all_channels(beat_channel);
        free_album_tree(db);
        return 1;
    }

    pad_channel->gain = 0.45f;
    beat_channel->gain = 0.90f;

    fill_pad_channel(pad_channel);

    StepSequencer seq;
    build_demo_pattern(&seq);
    render_step_sequence(&seq, beat_channel->buffer, FRAME_COUNT);

    add_channel_to_mixer(&master_list, pad_channel);
    add_channel_to_mixer(&master_list, beat_channel);

    printf("[3] Filtre ve efekt zinciri calistiriliyor...\n");
    LowPassFilter lpf;
    init_lowpass(&lpf, 0.1f);
    process_lowpass(&lpf, pad_channel->buffer, FRAME_COUNT);

    VocalEffect beat_fx = {"Beat Distortion", 1, 1.35f, 0.0f, 1};
    apply_vocal_effect(beat_channel, &beat_fx, FRAME_COUNT);
    process_highpass(beat_channel->buffer, FRAME_COUNT, 0.85f);

    printf("[4] Buffer analizleri hesaplanir...\n");
    AudioStats pad_stats = analyze_buffer(pad_channel->buffer, FRAME_COUNT);
    AudioStats beat_stats = analyze_buffer(beat_channel->buffer, FRAME_COUNT);
    print_audio_stats("Pad kanali", pad_stats);
    print_audio_stats("Beat kanali", beat_stats);

    printf("[5] Mixer master cikisi hesaplaniyor...\n");
    float* master_output = (float*)malloc(FRAME_COUNT * sizeof(float));
    if (master_output == NULL) {
        printf("HATA: Master output icin bellek ayrilamadi.\n");
        free_all_channels(master_list);
        free_album_tree(db);
        return 1;
    }

    mix_master_output(master_list, master_output, FRAME_COUNT);
    AudioStats master_stats = analyze_buffer(master_output, FRAME_COUNT);
    print_audio_stats("Master output", master_stats);

    printf("\n[6] WAV dosyasi diske yaziliyor...\n");
    write_wav_file("output_test.wav", master_output, FRAME_COUNT, SAMPLE_RATE);

    printf("\n[7] Heap bellegi temizleniyor...\n");
    free_all_channels(master_list);
    free(master_output);
    free_album_tree(db);

    printf("\n>>> C Engine basariyla tamamlandi. <<<\n");
    return 0;
}

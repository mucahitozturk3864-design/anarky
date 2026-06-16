#include "filters.h"

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

void init_lowpass(LowPassFilter* filter, float alpha) {
    filter->previous_sample = 0.0f;
    filter->alpha = alpha;
}

EMSCRIPTEN_KEEPALIVE
void process_lowpass(LowPassFilter* filter, float* buffer, int frames) {
    // Sesi yumusatan (tizleri kesen) IIR konvolüsyon algoritması
    for (int i = 0; i < frames; i++) {
        float current = buffer[i];
        float filtered = (filter->alpha * current) + ((1.0f - filter->alpha) * filter->previous_sample);
        buffer[i] = filtered;
        filter->previous_sample = filtered;
    }
}

EMSCRIPTEN_KEEPALIVE
void process_highpass(float* buffer, int frames, float cutoff) {
    // Bas sesleri kesen basit differansiyel (türev) algoritmasi
    float previous = 0.0f;
    for (int i = 0; i < frames; i++) {
        float current = buffer[i];
        float filtered = current - previous; // Degisim hizi (Tizler yuksek degisim hizina sahiptir)
        previous = current;
        buffer[i] = filtered * cutoff;
    }
}

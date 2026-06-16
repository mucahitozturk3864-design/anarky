#ifndef FILTERS_H
#define FILTERS_H

// FIR Filter (Low-pass) için bellek tutucu (State)
typedef struct {
    float previous_sample;
    float alpha; // Filtre katsayısı (0.0 - 1.0)
} LowPassFilter;

void init_lowpass(LowPassFilter* filter, float alpha);
void process_lowpass(LowPassFilter* filter, float* buffer, int frames);

// Yüksek frekansları tutan High-pass filter
void process_highpass(float* buffer, int frames, float cutoff_coefficient);

#endif

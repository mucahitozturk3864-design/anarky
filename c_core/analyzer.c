#include <math.h>
#include <stdio.h>
#include "analyzer.h"

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

EMSCRIPTEN_KEEPALIVE
AudioStats analyze_buffer(const float* buffer, int frames) {
  AudioStats stats;
  stats.peak = 0.0f;
  stats.rms = 0.0f;
  stats.average = 0.0f;
  stats.zero_crossings = 0;

  if (buffer == 0 || frames <= 0) return stats;

  double sum = 0.0;
  double square_sum = 0.0;
  float previous = buffer[0];

  for (int i = 0; i < frames; i++) {
    float sample = buffer[i];
    float abs_sample = fabsf(sample);

    if (abs_sample > stats.peak) {
      stats.peak = abs_sample;
    }

    sum += sample;
    square_sum += sample * sample;

    if ((previous < 0.0f && sample >= 0.0f) || (previous >= 0.0f && sample < 0.0f)) {
      stats.zero_crossings++;
    }

    previous = sample;
  }

  stats.average = (float)(sum / frames);
  stats.rms = (float)sqrt(square_sum / frames);
  return stats;
}

EMSCRIPTEN_KEEPALIVE
void print_audio_stats(const char* label, AudioStats stats) {
  printf("    %s -> peak: %.3f | rms: %.3f | avg: %.3f | zero-cross: %d\n",
         label,
         stats.peak,
         stats.rms,
         stats.average,
         stats.zero_crossings);
}

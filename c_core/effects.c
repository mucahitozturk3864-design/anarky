#include "effects.h"

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

EMSCRIPTEN_KEEPALIVE
void apply_distortion_effect(float* buffer, int frames, float drive) {
  float threshold = 0.8f;
  for (int i = 0; i < frames; i++) {
    float val = buffer[i] * drive;
    if (val > threshold) {
      buffer[i] = threshold;
    } else if (val < -threshold) {
      buffer[i] = -threshold;
    } else {
      buffer[i] = val;
    }
  }
}

EMSCRIPTEN_KEEPALIVE
void apply_robot_voice(float* buffer, int frames) {
  for (int i = 0; i < frames; i++) {
    if (buffer[i] > 0.0f) {
      buffer[i] = 0.5f;
    } else if (buffer[i] < 0.0f) {
      buffer[i] = -0.5f;
    }
  }
}

EMSCRIPTEN_KEEPALIVE
void apply_vocal_effect(AudioChannel* ch, VocalEffect* fx, int frames) {
  if (!fx->enabled || !ch->is_active) return;
  
  switch (fx->effect_type) {
    case 1: 
      apply_distortion_effect(ch->buffer, frames, fx->intensity);
      break;
    case 2: 
      apply_robot_voice(ch->buffer, frames);
      break;
    default:
      break;
  }
}

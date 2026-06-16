#include <string.h>
#include "mixer.h"

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

EMSCRIPTEN_KEEPALIVE
void mix_master_output(AudioChannel* head, float* master_out, int frames) {
  memset(master_out, 0, frames * sizeof(float));
  
  AudioChannel* current = head;
  
  while (current != NULL) {
    if (current->is_active) {
      for (int i = 0; i < frames; i++) {
        master_out[i] += current->buffer[i] * current->gain;
      }
    }
    current = current->next; 
  }
  
  for (int i = 0; i < frames; i++) {
    if (master_out[i] > 1.0f) master_out[i] = 1.0f;
    if (master_out[i] < -1.0f) master_out[i] = -1.0f;
  }
}

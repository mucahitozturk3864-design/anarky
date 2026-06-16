#include <stdlib.h>
#include "channel.h"

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

EMSCRIPTEN_KEEPALIVE
AudioChannel* create_channel(int sample_rate) {
  AudioChannel* ch = (AudioChannel*)malloc(sizeof(AudioChannel));
  if (ch == NULL) return NULL; 
  
  ch->buffer      = (float*)calloc(sample_rate * 2, sizeof(float));
  ch->sample_rate = sample_rate;
  ch->gain        = 1.0f;
  ch->pan         = 0.0f;
  ch->is_active   = 1;
  ch->next        = NULL; 
  return ch;
}

EMSCRIPTEN_KEEPALIVE
void add_channel_to_mixer(AudioChannel** head, AudioChannel* new_ch) {
  if (*head == NULL) {
    *head = new_ch; 
  } else {
    AudioChannel* current = *head;
    while (current->next != NULL) {
      current = current->next;
    }
    current->next = new_ch;
  }
}

EMSCRIPTEN_KEEPALIVE
void free_all_channels(AudioChannel* head) {
  AudioChannel* current = head;
  AudioChannel* next_node;
  
  while (current != NULL) {
    next_node = current->next;
    if (current->buffer != NULL) {
      free(current->buffer);
    }
    free(current);
    current = next_node;
  }
}

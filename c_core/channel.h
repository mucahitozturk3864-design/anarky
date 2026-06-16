#ifndef CHANNEL_H
#define CHANNEL_H
#include "types.h"

AudioChannel* create_channel(int sample_rate);
void add_channel_to_mixer(AudioChannel** head, AudioChannel* new_ch);
void free_all_channels(AudioChannel* head);

#endif

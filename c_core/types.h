#ifndef TYPES_H
#define TYPES_H

// İleri Bildirim (Forward Declaration) - Linked list yapısı için
typedef struct AudioChannel AudioChannel;

// Ses Kanalı Yapısı (Linked List Node)
struct AudioChannel {
  float*  buffer;        // PCM sample pointer (Dinamik Bellek)
  int     sample_rate;   // e.g. 48000
  float   gain;          // 0.0 – 1.0
  float   pan;           // -1.0 – 1.0
  int     is_active;
  AudioChannel* next;    // Linked List Node Pointer (Bir sonraki ses kanalını işaret eder)
};

typedef struct {
  char    name[32];
  int     effect_type;   // 0=autotune 1=distortion 2=robot ...
  float   intensity;
  float   pitch_shift;
  int     enabled;
} VocalEffect;

#endif

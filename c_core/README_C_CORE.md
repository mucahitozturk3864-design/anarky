# ANARKY C Core

Bu klasor, ANARKY projesinin C ile yazilmis ana ses isleme cekirdegini
icerir. Web arayuzu proje deneyimini gosterir; bu klasordeki C modulleri ise
dersin ana konusu olan algoritma, veri yapisi, pointer, dinamik bellek ve dosya
islemleri tarafini temsil eder.

## Modul Ozeti

- `main.c`: Test senaryosunu calistirir. Album veritabani kurulur, ses kanali
  olusturulur, filtre uygulanir, mixer cikisi alinir ve WAV dosyasi yazilir.
- `types.h`: `AudioChannel` ve `VocalEffect` veri yapilarini tanimlar.
- `channel.c/.h`: Linked list seklinde ses kanallari olusturur, mixere ekler ve
  heap bellegini temizler.
- `sequencer.c/.h`: 16 adimli step sequencer yapisini yonetir ve ritim pattern
  verisini ses buffer'ina render eder.
- `analyzer.c/.h`: Ses buffer'i uzerinden peak, RMS, ortalama ve zero-crossing
  istatistiklerini hesaplar.
- `mixer.c/.h`: Aktif kanallardaki PCM sample degerlerini gain katsayisiyla
  toplar ve cikisi `[-1.0, 1.0]` araliginda sinirlar.
- `effects.c/.h`: Distortion ve robot voice gibi buffer uzerinde calisan efekt
  fonksiyonlarini icerir.
- `filters.c/.h`: Low-pass ve high-pass filtre islemlerini sample dizisi
  uzerinde uygular.
- `album_bst.c/.h`: Albumleri Binary Search Tree yapisinda tutar, ekleme ve ID
  ile arama yapar.
- `wav_writer.c/.h`: Float sample verisini 16-bit PCM WAV formatina cevirip
  dosyaya yazar.

## Derleme

Windows ortaminda `make` yoksa dogrudan `gcc` ile derlenebilir:

```powershell
gcc -Wall -Wextra -O2 main.c channel.c effects.c mixer.c wav_writer.c album_bst.c filters.c sequencer.c analyzer.c -o anarky_daw_core.exe -lm
.\anarky_daw_core.exe
```

Linux/macOS veya Make kurulu Windows ortaminda:

```bash
make
./anarky_daw_core
```

Program basarili calistiginda `output_test.wav` adli test ses dosyasi uretilir.

## C Dersi Acisindan One Cikan Konular

- `struct` ile veri modelleme
- Pointer ve pointer-to-pointer kullanimi
- Dinamik bellek yonetimi (`malloc`, `calloc`, `free`)
- Linked list ve Binary Search Tree veri yapilari
- Class benzeri moduler C tasarimi (`.h` arayuz + `.c` uygulama + `struct`)
- Step sequencer algoritmasi ve pattern tabanli ses uretimi
- Ses analizi: peak, RMS, average ve zero-crossing hesaplama
- Donguler ile sample buffer isleme
- Dosya yazma ve binary WAV header olusturma
- Moduler C kod yapisi ve header/source ayrimi

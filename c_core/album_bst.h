#ifndef ALBUM_BST_H
#define ALBUM_BST_H

typedef struct AlbumNode {
    int album_id;
    char title[64];
    int release_year;
    struct AlbumNode* left;
    struct AlbumNode* right;
} AlbumNode;

// Fonksiyon prototipleri
AlbumNode* create_album_node(int id, const char* title, int year);
AlbumNode* insert_album(AlbumNode* root, int id, const char* title, int year);
AlbumNode* search_album_by_id(AlbumNode* root, int target_id);
void free_album_tree(AlbumNode* root);

#endif

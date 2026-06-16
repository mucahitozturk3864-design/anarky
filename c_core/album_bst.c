#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include "album_bst.h"

// Yeni bir BST düğümü (node) oluşturur
AlbumNode* create_album_node(int id, const char* title, int year) {
    AlbumNode* newNode = (AlbumNode*)malloc(sizeof(AlbumNode));
    newNode->album_id = id;
    newNode->release_year = year;
    strncpy(newNode->title, title, 63);
    newNode->title[63] = '\0';
    newNode->left = NULL;
    newNode->right = NULL;
    return newNode;
}

// Rekürsif olarak ağaca albüm ekler
AlbumNode* insert_album(AlbumNode* root, int id, const char* title, int year) {
    if (root == NULL) {
        return create_album_node(id, title, year);
    }
    
    // ID'ye göre ağaca yerleştirme (Küçükler sola, büyükler sağa)
    if (id < root->album_id) {
        root->left = insert_album(root->left, id, title, year);
    } else if (id > root->album_id) {
        root->right = insert_album(root->right, id, title, year);
    }
    
    return root;
}

// Rekürsif olarak ID'ye göre albüm arar
AlbumNode* search_album_by_id(AlbumNode* root, int target_id) {
    if (root == NULL || root->album_id == target_id) {
        return root;
    }
    
    if (root->album_id < target_id) {
        return search_album_by_id(root->right, target_id);
    }
    
    return search_album_by_id(root->left, target_id);
}

// Ağacı bellekten tamamen siler (Post-order traversal)
void free_album_tree(AlbumNode* root) {
    if (root != NULL) {
        free_album_tree(root->left);
        free_album_tree(root->right);
        free(root);
    }
}

# SnapchatViolet 💜

**Générateur de shitpost de qualité.**
Créez des faux screenshots Snapchat avec un effet "Deep Fried" réaliste et des emojis style iPhone, directement dans votre navigateur.

![Preview](media/preview.png)
*(Ajoutez une capture d'écran ici si vous en avez une, sinon supprimez cette ligne)*

## ✨ Fonctionnalités

*   **🔥 Deep Fry Réaliste** : Simulation de la compression JPEG via un algorithme itératif.
*   **🍎 Emojis iOS** : Remplissage automatique des emojis standards par leurs versions Apple.
*   **📝 Texte & Bandes** : Ajoutez des bandes de texte (style Snap) ou du texte libre.
*   **🖼️ Stickers** : Importez vos propres images, redimensionnez-les et détruisez-les.
*   **🎛️ Contrôle Total** :
    *   Glisser-déposer pour tout positionner.
    *   Sliders de friture individuels par élément.
    *   Teinte violette ajustable.
    *   Zoom d'image.

## 🚀 Utilisation

1.  **Ouvrez** `index.html` dans votre navigateur.
2.  **Importez** une image de base.
3.  **Ajoutez** du texte ou des stickers via le menu "➕ Ajouter".
4.  **Ajustez** la "Pourriture" (Deep Fry) globale ou par élément.
5.  **Téléchargez** votre chef-d'œuvre.

## 🛠️ Stack Technique

*   **HTML5 / CSS3** (Vanilla)
*   **JavaScript** (Canvas API)
*   **Aucun Framework** : Pur code, zéro dépendance complexe.
*   **Emoji Source** : [emoji-datasource-apple](https://github.com/iamcal/emoji-data) via jsDelivr.

## 📄 Installation (Local)

Il suffit de cloner le repo et d'ouvrir le fichier HTML.

```bash
git clone https://github.com/VOTRE_USERNAME/SnapchatViolet.git
cd SnapchatViolet
# Ouvrez index.html
```

## ⚠️ Note sur l'exécution locale
Pour que les emojis fonctionnent correctement en local (contournement des restrictions CORS du Canvas), assurez-vous d'utiliser les images fournies via le CDN intégré (déjà configuré) ou lancez un petit serveur local (ex: `python -m http.server`).

---

**Version** : 1.0.0
**Auteur** : Lnkhey
**Licence** : MIT (Faites-en ce que vous voulez, c'est pour le shitpost)

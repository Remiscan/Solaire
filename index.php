<?php
$commonDir = '../_common';
require_once $commonDir.'/php/Translation.php';
$translation = new Translation('{ "fr": {}, "en": {} }');
$httpLanguage = $translation->getLanguage();
$urlLang = isset($_GET['lang']) ? htmlspecialchars($_GET['lang']) : null;
?>
<!doctype html>
<html data-http-lang="<?=$httpLanguage?>" data-forced-lang="<?=$urlLang ?? ''?>">
  <head>
    <meta charset="utf-8">
    <title>Solaire</title>
    <meta name="description" content="Simulation de système planétaire généré procéduralement, dans un style minimaliste.">
    
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="hsl(0, 0%, 0%)">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">

    <meta property="og:title" content="Solaire">
    <meta property="og:description" content="Simulation de système planétaire généré procéduralement, dans un style minimaliste.">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://remiscan.fr/solaire/">
    <meta property="og:image" content="https://remiscan.fr/mon-portfolio/projets/solaire/og-preview.png">

    <link rel="icon" type="image/png" href="/solaire/icons/icon-192.png">
    <link rel="apple-touch-icon" href="/solaire/icons/apple-touch-icon.png">
    <link rel="manifest" href="/solaire/manifest.json">

    <link rel="stylesheet" href="/solaire/styles/application.css">
    <link rel="stylesheet" href="/solaire/styles/systeme.css">
    <link rel="preload" as="fetch" href="/solaire/strings.json" crossorigin>

    <script defer src="/solaire/ext/MersenneTwister.js"></script>
    <script defer src="/solaire/ext/localforage.min.js"></script>
    <script type="module" src="/solaire/modules/main.js"></script>

    <style id="style-welcome">
      #welcome {
        display: grid;
        place-items: center;
        grid-template-columns: 100%;
        width: 100%;
        height: calc(100% + 56px);
        position: fixed;
        top: 0;
        left: 0;
        background-color: hsl(var(--etoile-couleur, 342), 19%, 10%);
        z-index: 1000;
        opacity: 1;
        cursor: wait;
      }

      body[data-first-visit] {
        --etoile-couleur: 342;
      }

      body[data-first-visit] #welcome {
        cursor: auto;
      }

      .first-visit {
        display: none;
        grid-template-columns: auto;
        max-width: 50ch;
        color: white;
        font-size: 1.5em;
        position: relative;
        top: calc(-1.5 * 56px);
      }

      body[data-first-visit] .first-visit {
        display: grid;
      }

      body[data-first-visit] #appbar {
        position: relative;
        z-index: 2000;
      }

      body[data-first-visit] #appbar button:not(#bouton-explorer) {
        display: none;
      }
    </style>
  </head>

  <body>

    <!----- SYSTÈME PLANÉTAIRE ----------------------------------------------->
    

    <div class="conteneur-systeme" aria-hidden="true">
      <div id="systeme"></div>
    </div>

    <div id="welcome">
      <div class="first-visit">
        <p data-string="first-visit-1"></p>
        <p data-string="first-visit-2"></p>
        <p data-string="first-visit-3"></p>
      </div>
    </div>



    <!----- BOUTONS ---------------------------------------------------------->


    <!-- Barre du haut : Installer, préc./suiv., màj, partage, paramètres -->
    <div id="topbar">
      <div class="boutons-groupe">
        <button type="button" id="bouton-precedent" data-label="systeme-precedent">
          <i class="material-icons" aria-hidden="true">arrow_back</i>
        </button>

        <button type="button" id="bouton-suivant" data-label="systeme-suivant" tabIndex="-1" disabled>
          <i class="material-icons" aria-hidden="true">arrow_forward</i>
        </button>

        <button type="button" id="bouton-installer" tabIndex="-1" disabled>
          <i class="material-icons" aria-hidden="true">get_app</i>
          <span data-string="bouton-installer"></span>
        </button>
      </div>

      <div class="boutons-groupe allow-scroll">
        <button type="button" id="bouton-maj" tabIndex="-1" disabled>
          <i class="material-icons" aria-hidden="true">update</i>
          <span data-string="bouton-maj"></span>
        </button>
      </div>

      <div class="boutons-groupe">
        <button type="button" id="bouton-partage" data-label="partager">
          <i class="material-icons" aria-hidden="true">share</i>
        </button>

        <button type="button" id="bouton-parametres" aria-labelledby="parametres-titre" data-menu="parametres">
          <i class="material-icons" aria-hidden="true">settings</i>
        </button>
      </div>
    </div>

    <div id="progression-maj"></div>

  
    <!-- Barre du bas : interface, play/pause, explorer, découvertes/navigation, redim. -->
    <div id="appbar">
      <div class="boutons-groupe">
        <button type="button" id="bouton-interface" data-off="visibility_off" data-on="visibility" data-label="visibilite-interface">
          <i class="material-icons" aria-hidden="true">visibility</i>
        </button>
      </div>

      <div class="boutons-groupe">
        <button type="button" class="pulsable" id="bouton-pause" data-off="play_arrow" data-on="pause" data-label="pauser-animations">
          <i class="material-icons" aria-hidden="true">pause</i>
        </button>

        <button type="button" class="pulsable" id="bouton-explorer" data-label="bouton-explorer">
          <i class="material-icons" aria-hidden="true"></i>
          <span data-string="bouton-explorer"></span>
        </button>

        <button type="button" class="pulsable" id="bouton-decouvertes" aria-labelledby="carnet-titre">
          <i class="material-icons" aria-hidden="true">book</i>
        </button>
      </div>

      <div class="boutons-groupe allow-scroll">
        <button type="button" class="pulsable" id="bouton-redimensionner" data-label="redimensionner" tabIndex="-1" disabled>
          <i class="material-icons" aria-hidden="true">aspect_ratio</i>
        </button>
      </div>
    </div>


    <textarea id="url-getter" tabIndex="-1" disabled></textarea>



    <!----- MENUS ------------------------------------------------------------>

    
    <!-- Partage -->
    <div class="minipop" id="pop-partage" data-menu="partage">
      <span data-string="partage-message"></span>
    </div>


    <!-- Paramètres -->
    <div class="minipop" id="pop-parametres" data-menu="parametres">
      <h3 class="pop-titre" data-string="parametres-titre" id="parametres-titre"></h3>

      <div class="pop-contenu">
        <input type="checkbox" id="switch-bg">
        <label for="switch-bg">
          <span data-string="parametre-couleur-fond"></span>
          <div class="switch"></div>
        </label>

        <input type="checkbox" id="switch-textures">
        <label for="switch-textures">
          <span data-string="parametre-planetes-texturees"></span>
          <div class="switch"></div>
        </label>

        <input type="checkbox" id="switch-orbites">
        <label for="switch-orbites">
          <span data-string="parametre-orbites"></span>
          <div class="switch"></div>
        </label>

        <input type="checkbox" id="switch-orbites-lunaires">
        <label for="switch-orbites-lunaires">
          <span data-string="parametre-orbites-lunes"></span>
          <div class="switch"></div>
        </label>

        <input type="checkbox" id="switch-orbites-colorees">
        <label for="switch-orbites-colorees">
          <span data-string="parametre-orbites-colorees"></span>
          <div class="switch"></div>
        </label>

        <input type="checkbox" id="switch-ombres">
        <label for="switch-ombres">
          <span data-string="parametre-ombres"></span>
          <div class="switch"></div>
        </label>

        <input type="checkbox" id="switch-ombres-exagerees">
        <label for="switch-ombres-exagerees">
          <span data-string="parametre-ombres-exagerees"></span>
          <div class="switch"></div>
        </label>

        <div class="groupe-parametres">
          <span data-string="parametre-langage"></span>
          <div><button type="button" class="bouton-langage" data-string="bouton-langage" tabIndex="-1" disabled></button></div>
        </div>

        <div class="groupe-parametres" style="display: none;">
          <div class="conteneur-check-maj">
            <button type="button" class="bouton-check-maj" data-string="bouton-check-maj" tabIndex="-1" disabled></button>
            <span>v.</span>
          </div>
        </div>
      </div>
    </div>


    <!-- Notification -->
    <div class="minipop bottom" id="pop-notification" data-menu="notification">
      <div class="notification-icone"></div>
      <div class="notification-message"></div>
      <div class="notification-actions"></div>
    </div>


    <!-- Nouvelles découvertes -->
    <div class="minipop bottom" id="pop-nouvelle-decouverte" data-menu="nouvelle-decouverte">
      <h3 class="pop-titre"></h3>

      <div class="pop-contenu liste-genese">
        <div class="decouverte nouvel-univers new">
          <i class="material-icons icon" aria-hidden="true">mode_comment</i>
          <span class="decouverte-titre" data-string="genese-titre"></span>
          <span class="decouverte-description" data-string="genese-description"></span>
        </div>
      </div>

      <div class="pop-contenu liste-nouvelle-decouverte"></div>
    </div>


    <!-- Découvertes & navigation -->
    <div class="minipop bottom" id="pop-decouvertes" data-menu="decouvertes">
      <button type="button" class="transparent pop-titre-icone" id="supprimer-decouvertes" data-label="supprimer-decouvertes">
        <i class="material-icons" aria-hidden="true">delete_forever</i>
      </button>
      <h3 class="pop-titre" data-string="carnet-titre" id="carnet-titre"></h3>

      <template id="template-decouverte">
        <div class="decouverte">
          <i class="material-icons icon" aria-hidden="true">bookmark</i>
          <span class="decouverte-titre"></span>
          <span class="decouverte-description"></span>
          <button type="button" class="decouverte-lien" tabIndex="-1" disabled></button>
        </div>
      </template>

      <template id="template-favori">
        <div class="decouverte favori">
          <button type="button" class="transparent icon yes">
            <i class="material-icons" aria-hidden="true">star</i>
          </button>
          <span class="decouverte-titre"></span>
          <span class="decouverte-description"></span>
          <button type="button" class="decouverte-lien" tabIndex="-1" disabled></button>
          <div class="vous-etes-ici"></div>
        </div>
      </template>

      <div class="pop-contenu liste-decouvertes"></div>
      <div class="pop-contenu liste-navigation"></div>

      <div class="formulaire-code">
        <label for="code-saisi" data-string="saisie-placeholder"></label>
        <input type="text" id="code-saisi" placeholder="Adresse d'un système" tabIndex="-1" disabled autocomplete="off">
        <button type="button" id="bouton-code-saisi" tabIndex="-1" disabled>
          <i class="material-icons" aria-hidden="true">explore</i><span data-string="bouton-visiter"></span>
        </button>
      </div>
      <ul class="carnet-onglets">
        <li id="onglet-decouvertes" class="on onglet">
          <button type="button" class="transparent" data-string="nav-decouvertes"></button>
        </li>
        <li id="onglet-navigation" class="onglet">
          <button type="button" class="transparent" data-string="nav-navigation"></button>
        </li>
      </ul>
    </div>
  </body>
</html>
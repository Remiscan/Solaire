<?php
// Vide le cache des stats des fichiers
clearstatcache();


//////////////////////////////////////////////////////////
// Vérifie les dates de dernière modification des fichiers
// et renvoie [ version, liste des fichiers modifiés ].
function getFilesVersion(int $versionFrom = 0): array {
  $rootDir = dirname(__DIR__, 1);

  $listeFichiers = json_decode(file_get_contents(__DIR__.'/../cache.json'), true)['files'];

  // Calcule la version de fichier la plus récente
  // et la liste des fichiers modifiés.
  $versionFichiers = 0;
  $listeFichiersModifies = [];
  foreach($listeFichiers as $fichier) {
    $path = $fichier;
    
    if (str_starts_with($path, '../'))
      $path = str_replace('../', dirname(__DIR__, 2).'/', $path);
    else if (str_starts_with($path, './'))
      $path = str_replace('./', dirname(__DIR__, 1).'/', $path);
    $dateFichier = filemtime($path);

    if ($dateFichier > $versionFrom) {
      $listeFichiersModifies[] = $fichier;
    }
    if ($dateFichier > $versionFichiers)
      $versionFichiers = $dateFichier;
  }
  // timestamp à 10 digits, généré par PHP
  return [
    $versionFichiers,
    $listeFichiersModifies
  ];
}


////////////////////////////////////////
// Transmission des données à JavaScript

$from = $_GET['from'] ?? 0;

$results = array();
[ $results['version-fichiers'], $results['liste-fichiers-modifies'] ] = getFilesVersion($from);

header('Content-Type: application/json');
echo json_encode($results, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES);
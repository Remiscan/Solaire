<?php
$json = json_decode(file_get_contents('cache.json'), true);
$listeFichiers = $json['fichiers'];
$versionFichiers = 0;
foreach($listeFichiers as $fichier)
{
  $date_fichier = filemtime($fichier);

  if ($date_fichier > $versionFichiers)
    $versionFichiers = $date_fichier;
}
$version = date('Y.m.d_H.i.s', $versionFichiers);

header('Content-Type: application/json');
echo json_encode(array(
  'version' => $version
), JSON_PRETTY_PRINT);
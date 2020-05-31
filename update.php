<?php
$versionDuJson = '';
$needjson = false;

$json = json_decode(file_get_contents('cache.json'), true);
$listeFichiers = $json['fichiers'];
$versionJson = $json['version'];
$versionFichiers = 0;
foreach($listeFichiers as $fichier)
{
  $date_fichier = filemtime($fichier);

  if ($date_fichier > $versionFichiers)
    $versionFichiers = $date_fichier;
}
$version = date('Y.m.d_H.i.s', $versionFichiers);

if ($versionJson != $version)
{
  $json['version'] = $version;
  file_put_contents('cache.json', json_encode($json, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
}

header('Content-Type: application/json');
echo json_encode(array(
  'version' => $version
), JSON_PRETTY_PRINT);
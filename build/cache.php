<?php
$cache = array();
$cache['files'] = [
  "./index.php",
  "./strings.json",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
];

$addDirToCache = function(string $dirPath, array $exclude = []) use (&$cache) {
  $filePaths = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator(
      $dirPath,
      RecursiveDirectoryIterator::SKIP_DOTS
    ),
    RecursiveIteratorIterator::SELF_FIRST
  );

  foreach($filePaths as $path => $obj) {
    if (is_dir($path)) continue;

    $pathRelativeToDir = str_replace($dirPath.'/', '', $path);
    if (in_array($pathRelativeToDir, $exclude)) continue;

    $pathRelativeToAppRoot = str_replace(dirname(__DIR__, 1), '.', $path);
    $cache['files'][] = $pathRelativeToAppRoot;
  }
};

$addDirToCache(dirname(__DIR__, 1).'/ext', exclude: ['README.md']);
$addDirToCache(dirname(__DIR__, 1).'/modules');
$addDirToCache(dirname(__DIR__, 1).'/styles');
$addDirToCache(dirname(__DIR__, 1).'/textures');

file_put_contents(__DIR__.'/../cache.json', json_encode($cache, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
echo date('Y-m-d H:i:s') . " cache.json built!\n";
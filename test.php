<?php
function hexagonCoord($a) {
  $coordonnees = '' . (sqrt(3)*$a) . ',0 ' . (2*sqrt(3)*$a) . ',' . $a . ' ' . (2*sqrt(3)*$a) . ',' . (3*$a) . ' ' . (sqrt(3)*$a) . ',' . (4*$a) . ' 0,' . (3*$a) . ' 0,' . ($a) . '';
  return $coordonnees;
}
function transX($a) { return (100 - 2*sqrt(3)*$a)/2; }
function transY($a) { return (100 - 4*$a)/2; }
// translate X de : (100 - 2*sqrt(3)*a)/2 %
// translate Y de : (100 - 4*a)/2 %

$json = json_decode(file_get_contents('cache.json'), true);
$versionJson = $json['version'];
$version = date('Y.m.d_H.i.s', time());
if ($versionJson != $version)
{
  $json['version'] = $version;
  file_put_contents('cache.json', json_encode($json, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
}
?>

<body style="background-color: darkgrey">
<svg xmlns="http://www.w3.org/2000/svg" version="1.1"
    viewBox="0 0 100 100" style="width:500px; height:500px;">
  <defs>
    <g id="nothing">
    </g>

    <g id="cloudy-circles">
      <circle cx="50" cy="50" r="45" fill="transparent" stroke="rgba(255, 255, 255, .2)" stroke-width="10" />
      <circle cx="50" cy="50" r="34" fill="transparent" stroke="rgba(255, 255, 255, .1)" stroke-width="12" />
      <circle cx="50" cy="50" r="21" fill="transparent" stroke="rgba(255, 255, 255, .2)" stroke-width="14" />
      <circle cx="50" cy="50" r="6" fill="transparent" stroke="rgba(255, 255, 255, .1)" stroke-width="16" />
      <circle cx="50" cy="50" r="1" fill="transparent" stroke="rgba(255, 255, 255, .1)" stroke-width="4" />
    </g>

    <g id="dark-cloudy-circles">
      <circle cx="50" cy="50" r="45" fill="transparent" stroke="rgba(0, 0, 0, .2)" stroke-width="10" />
      <circle cx="50" cy="50" r="34" fill="transparent" stroke="rgba(0, 0, 0, .1)" stroke-width="12" />
      <circle cx="50" cy="50" r="21" fill="transparent" stroke="rgba(0, 0, 0, .2)" stroke-width="14" />
      <circle cx="50" cy="50" r="6" fill="transparent" stroke="rgba(0, 0, 0, .1)" stroke-width="16" />
      <circle cx="50" cy="50" r="1" fill="transparent" stroke="rgba(0, 0, 0, .1)" stroke-width="4" />
    </g>

    <g id="hexagonal-clouds">
      <polygon points="43.30,0 86.60,25 86.60,75 43.30,100 0,75 0,25" fill="transparent" stroke="rgba(255, 255, 255, .2)" stroke-width="15" style="transform: translate(6.69%,0%)"></polygon>
      <polygon points="25.98,0 51.96,15 51.96,45 25.98,60 0,45 0,15" fill="transparent" stroke="rgba(255, 255, 255, .1)" stroke-width="24" style="transform: translate(24.02%,20%)"></polygon>
      <polygon points="6.92,0 13.85,4 13.85,12 6.92,16 0,12 0,4" fill="transparent" stroke="rgba(255, 255, 255, .1)" stroke-width="18" style="transform: translate(43.07%,42%)"></polygon>
    </g>

    <radialGradient id="degrade-clair">
      <stop offset="40%" stop-color="rgba(255, 255, 255, 0)" />
      <stop offset="100%" stop-color="rgba(255, 255, 255, .2)" />
    </radialGradient>

    <g id="radial-gradient-clouds">
      <circle cx="50" cy="50" r="50" fill="url(#degrade-clair)" />
    </g>
  </defs>

  <rect x="0" y="0" width="100" height="100" style="fill:rgba(0, 0, 0, .5)"/>
  <polygon points="43.30,0 86.60,25 86.60,75 43.30,100 0,75 0,25" fill="transparent" stroke="rgba(255, 255, 255, .3)" stroke-width="15" style="transform: translate(6.69%,0%)"></polygon>
    <polygon points="25.98,0 51.96,15 51.96,45 25.98,60 0,45 0,15" fill="transparent" stroke="rgba(255, 255, 255, .2)" stroke-width="20" style="transform: translate(24.02%,20%)"></polygon>
    <polygon points="6.92,0 13.85,4 13.85,12 6.92,16 0,12 0,4" fill="transparent" stroke="rgba(255, 255, 255, .3)" stroke-width="18" style="transform: translate(43.07%,42%)"></polygon>
    <polygon points="<?=hexagonCoord(1)?>" fill="transparent" stroke="rgba(255, 255, 255, .1)" stroke-width="4" style="transform: translate(<?=transX(1).'%,'.transY(1).'%'?>)"></polygon>
  
  <!--<polygon points="<?=hexagonCoord(25)?>" fill="transparent" stroke="rgba(255, 255, 255, .2)" stroke-width="15" style="transform: translate(<?=transX(25).'%,'.transY(25).'%'?>)"></polygon>
  <polygon points="<?=hexagonCoord(15)?>" fill="transparent" stroke="rgba(255, 255, 255, .1)" stroke-width="24" style="transform: translate(<?=transX(15).'%,'.transY(15).'%'?>)"></polygon>
  <polygon points="<?=hexagonCoord(4)?>" fill="transparent" stroke="rgba(255, 255, 255, .1)" stroke-width="18" style="transform: translate(<?=transX(4).'%,'.transY(4).'%'?>)"></polygon>-->
</svg>

<script>
function printa() { return new Promise(resolve => { setTimeout(() => { console.log('a'); resolve(); }, 1000) }) };
function printb() { return new Promise(resolve => { setTimeout(() => { console.log('b'); resolve(); }, 1000) }) };
function printc() { return new Promise(resolve => { setTimeout(() => { console.log('c'); resolve(); }, 1000) }) };

// Test sur les promesses. a, b et c doivent apparaître tour à tour à 1 sec d'intervalle.
//// Méthode 1 => fonctionne :)
//// Méthode 2 => fonctionne :)
//// Méthode 3 => fonctionne :)
//// Méthode 4 => apparaissent tous en même temps
//// Méthode 5 => fonctionne :) mais on pourra pas chaîner ensuite avec test(5).then(...)
function test(i)
{
  if (i == 1)  {
    return printa()
    .then(printb)
    .then(printc);
  } else if (i == 2) {
    return printa()
    .then(() => printb())
    .then(() => printc());
  } else if (i == 3) {
    return printa()
    .then(() => { return printb(); })
    .then(() => { return printc(); });
  } else if (i == 4) {
    return printa()
    .then(printb())
    .then(printc());
  } else if (i == 5) {
    printa().then(printb).then(printc);
  }
}

function testAll()
{
  const promise1 = new Promise(resolve => { resolve('a'); });
  const promise2 = new Promise(resolve => { resolve('b'); });
  return Promise.all([promise1, promise2])
  .then(([val1, val2]) => console.log(val1, val2));
}
</script>
</body>
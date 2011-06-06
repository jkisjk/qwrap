<?php 
@header("Content-Type:text/html;charset=gb-2312"); 
@header('Cache-Control: no-cache'); @header('Pragma: no-cache');
$_d = $_GET["delay"]/1000;
sleep($_d);
?>{err:'<?php if($_GET["err"] == "mcphp.fatal") print("mcphp.fatal"); else print("mcphp.ok"); ?>',city:"shanghai",user:"JK_QW"}
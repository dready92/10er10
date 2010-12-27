<?PHP

function log_message($d,$m) {
echo "$d: $m\n";
}

require_once("Email.php");


$from = "";
$to = "";
$subject = "";
$from_name = null;

while ( $arg = array_shift($argv) ) {
	if ( $arg == "-t" ) {
		$to = array_shift($argv);
	} elseif ( $arg == "-f" ) {
                $from = array_shift($argv);
        } elseif ( $arg == "-s" ) {
                $subject = array_shift($argv);
        } elseif ( $arg == "-n" ) {
                $from_name = array_shift($argv);
        }

}
if ( !strlen($from) || !strlen($to) || !strlen($subject) ) {
echo "from, to and subject are required";
exit(1);
}

$txt = "";
while (($buffer = fgets(STDIN, 4096)) !== false) {
  $txt.= $buffer;
}

$email = new CI_Email();
$email->from($from,$from_name);
$email->to($to);

$email->subject($subject);
$email->message($txt);

$sent  = $email->send();
if ( $sent ) {
exit(0);
} else {
echo "error on email sending";
exit(1);
}




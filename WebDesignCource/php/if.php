<?php
    define( "TITLE", "If, Else &amp; Elseif Statements" );
?>

<!DOCTYPE html>

<html>

    <head>
        
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title><?php echo TITLE; ?></title>

        <!-- Bootstrap CSS -->
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css">

        <!-- HTML5 shim and Respond.js for IE8 support of HTML5 elements and media queries -->
        <!-- WARNING: Respond.js doesn't work if you view the page via file:// -->
        <!--[if lt IE 9]>
            <script src="https://oss.maxcdn.com/html5shiv/3.7.2/html5shiv.min.js"></script>
            <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
        <![endif]-->
    </head>
    
    <body>
        <div class="container">
            <h1><?php echo TITLE; ?></h1>
            
            <?php
                // IF expression is TRUE, do something
                // IF expression is FALSE, don't do anything
                
                $foo = 99;
                $bar = 79;

                if ( $foo > $bar ) {
                    echo "$foo is greater than $bar <br>";
                }

                // ELSE

                $currentlyListeningTo = "Barenaked Ladies";
                
                if ( $currentlyListeningTo == "The Tragically Hip" ) {
                    
                    echo "You are listening to $currentlyListeningTo";
                    
                } else {
                    
                    echo "Taking a wild guess here, you're listening to $currentlyListeningTo <br>";
                    
                }

                // ELSEIF

                $favProgrammingLang = "PHP";

                if ( $favProgrammingLang == "C++" ) {
                    
                    echo "Your favourite programming language is $favProgrammingLang";
                    
                } elseif ( $favProgrammingLang == "PHP" ) {
                    
                    echo "Good one! You dig $favProgrammingLang";
                    
                } else {
                    
                    echo "Guess you don't like PHP or C++. Oh well...";
                    
                }

            ?>
            
        </div>
        
        <!-- jQuery -->
        <script src="//code.jquery.com/jquery-2.1.4.min.js"></script>
        
        <!-- Bootstrap JS -->
        <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/js/bootstrap.min.js"></script>
    </body>
</html>































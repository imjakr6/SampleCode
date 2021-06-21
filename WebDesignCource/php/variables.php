<?php
    define( "TITLE", "PHP Variables & Constants" );
?>

<!DOCTYPE html>

<html>

    <head>
        <title><?php echo TITLE; ?></title>
    </head>
    
    <body>

        <?php
            
            // VARIABLES
            
            // BOOLEAN: A boolean variable specifies a value of true or false
            $loggedIn = true;

            // INTEGER: An integer variable is any whole number
            $myAge = 26;

            // FLOATING POINT: Usually a fractional number, with a decimal
            $totalPrice = 146.28;

            // STRING: Simple text that must be enclosed within double quotations " " or single quotations ' '
            $fullName = "Brad Hussey";

            // DISPLAY VARIABLES ON SCREEN
            echo "Hello, my name is $fullName and I am $myAge years old!";

            // CONSTANTS
            define( "TITLE", "PHP Variables & Constants" );

            echo TITLE;

        ?>
        
        
    </body>
</html>































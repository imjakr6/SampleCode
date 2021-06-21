#include <stdio.h>
#include <assert.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

#include "Object.h"
  //-----------------------------------------
// NAME: Jake Lund | lundj3
// STUDENT NUMBER: 7797505
// COURSE: COMP 2160, SECTION: A02
// INSTRUCTOR: ZAPP
// ASSIGNMENT: assignment 4
// 
// REMARKS: DISCRIPTION: this is a set of tests to detrimin if the fuctions of the 
//object manager are properly implmented and no errors are happening.
//-----------------
//-------------------------------------------------------------------------------------
// CONSTANTS and TYPES
//-------------------------------------------------------------------------------------
typedef enum BOOL { wrong, right } Boolean;
//-------------------------------------------------------------------------------------
// VARIABLES
//-------------------------------------------------------------------------------------
//tests
static int testsPassed;
static int testsFailed;
static int currentSize;
//test objects
int id1;
int id2;
int id3;
//pointers for object references
char *ptr;
char *ptr2;
//-------------------------------------------------------------------------------------
// PROTOTYPES
//-------------------------------------------------------------------------------------
//basic test
void testSize();
void testInsert();
void testRetrive();
void testRefference();
void testLeaks();
void testEmpty();
void testCompact();
//start clean suites
void initSuite();
void cleanSuite();

//-------------------------------------------------------------------------------------
// FUNCTIONS
//-------------------------------------------------------------------------------------

int main( int argc, char *argv[] )
{
  initSuite();
  
  printf( "Initiating tests for the ObjectManager .\n\n" );
  testEmpty();
  testInsert();
  testRetrive();
  testRefference();
  testCompact();
  testLeaks();
  
  cleanSuite();
  printf( "\nTests completed successfully.\n" );
  
  return EXIT_SUCCESS;
}

// The suite setup function.

void initSuite()
{
  testsPassed = 0;
  testsFailed = 0;
  currentSize = 0;
}

//testing the insertObject method to make sure that 
//will only add appropriate sized objects
void testInsert(){
printf( "\nTesting  Object Insertion:" );
  printf( "\n----------------------\n" );
  
   initPool();
   
   if(insertObject(-1)){    
   
   printf( "\nTest Failed negative size entered\n" );
   testsFailed++;
   
   }else{
   printf( "\nTest Passed negative size not entered\n" );
   testsPassed++;
   }//else
   
   if(!insertObject(MEMORY_SIZE-1)){
   
   printf( "\nTest Failed did not insert max size\n" );
   testsFailed++;
   
   }else{
   printf( "\nTest Passed Max size entered\n" );
   testsPassed++;
   }//else
   
    if(insertObject(MEMORY_SIZE+1)){
   
   printf( "\nTest Failed size too Large\n" );
   testsFailed++;
   
   }else{
   printf( "\nTest Passed size Too Large not entered\n" );
   testsPassed++;
   }//else
   
   
   destroyPool();
   testEmpty();
}//testInsert

//test retrive to make sure that you are properly retreving the object
//and what the object holds
void testRetrive(){

printf( "\nTesting retrival of Object:" );
  printf( "\n----------------------\n" );
  
  initPool();
  id2 = insertObject(50);
  ptr2 = (char*)retrieveObject(id2);
  
  if(ptr2 != NULL){ 
   printf( "\nTest Passed  Retrived\n" );
   testsPassed++;
   
   }else{
     printf( "\nTest Failed not Retrived\n" );
   testsFailed++;
   }//else
   
  id1 = insertObject(50);
  ptr = (char*)retrieveObject(id1);
  
  for (int i = 0; i < 5; i++)
    ptr[i] = (char)(i%26 + 'A');
    
    
    
   if(strcmp(ptr, "ABCDE")==0){ 
   printf( "\nTest Passed correct chars Retrived\n" );
   testsPassed++;
   
   }else{
     printf( "\nTest Failed chars nor Retrived\n" );
   testsFailed++;
   }//else
   
   destroyPool();
   testEmpty();
}

//test add and drop reference to makes sure they are correctly adding and dropping
void testRefference(){
printf( "\nTesting Adding A Reference:" );
  printf( "\n----------------------\n" );
  initPool();
        
   id2 = insertObject(1000);
   id1 = insertObject(1000);
         
   for(int i=0; i<100; i++){      
   addReference(id1);
   }      
   dumpPool();
   printf("Manually check that count = 101");      
 
  
  printf( "\nTesting Removing A Reference:" );
  printf( "\n----------------------\n" );
  
  for(int i=0; i<100; i++){
  dropReference(id1);
  
  } 
  dumpPool();
   printf("Manually check that count = 1"); 
   
  destroyPool();
  testEmpty();       
}

//test to make sure there are no leaks while adding and refferencing objects
void testLeaks()
{
  int i;
#define LEAK_SIZE 1000

  printf( "\nTesting leaks:" );
  printf( "\n--------------\n" );
  
  for ( i=0 ; i<LEAK_SIZE ; i++ )
  {
   addReference(id1);
    currentSize++;
  }
   
  for ( i=0 ; i<LEAK_SIZE ; i++ )
  {
    dropReference( id1 );
    currentSize--;
  }
if(currentSize == 0){  
   printf( "\nTest Passed No Leaks\n" );
   testsPassed++;
   
   }else{
     printf( "\nTest Failed MEMORY LEAK\n" );
   testsFailed++;
  
   }//else
   destroyPool();
   testEmpty();
}
//test to make sure the garbage collector will only handle so much bytes
//and that it fires when it is supposed to
void testCompact(){
printf( "\nTesting Garbage collector:" );
initPool();

id1 = insertObject(500);

id3 = insertObject(MEMORY_SIZE);
dropReference(id2);
id2 = insertObject(5000);
dumpPool();
printf("should print ERROR for buufer overSize");
destroyPool();
}
void testEmpty(){

  initPool();
  printf( "\nTesting an empty table:" );
  printf( "\n-----------------------\n" );
  

  if ( retrieveObject(1)!=NULL ){
  
    printf( "\nFAILURE: retrieved an item from the empty table.\n" );
    testsFailed++;
  }else{
  
    printf( "\nPassed: unable to retrieved an item from the empty table.\n" );
    testsPassed++;
  }
destroyPool();
}
// The suite cleanup function.
void cleanSuite()
{
   destroyPool();
  printf( "\nTest results:\n" );
  printf( "%d tests were run.\n", testsPassed+testsFailed );
  printf( "%d tests passed.\n", testsPassed );
  printf( "%d tests failed.\n", testsFailed );
}


#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <time.h>
#include <unistd.h>
#include <sys/wait.h>

#include "procTracer.h"

// DID NOT HAVE (Object Orrientation for C/H) ON THIS FILE FOR EASY DISPLAY PURPOSES 

 //-----------------------------------------
// NAME: Jake Lund
// 
// REMARKS: DISCRIPTION: This is the beggining of a ray tracer I was making.
// a ray tracer is used to make a scene in graphics
//-----------------

//-------------------------------------------Vec.h----------------------------------
typedef struct {
  double x, y, z;
}Vec;

Vec makeVec(double x, double y, double z);
Vec normalize(Vec a);

Vec vecCross(Vec a, Vec b);
Vec vecNegate(Vec a);
double vecDot(Vec a, Vec b);
Vec vecAdd(Vec a, Vec b);
Vec vecMult(double b, Vec a);
//-------------------------------------------Vec.c----------------------------------
Vec makeVec(double x, double y, double z){
  Vec v;
  v.x = x;
  v.y = y;
  v.z = z;
  return v;
}//makeVec

Vec normalize(Vec a){
double mag = sqrt((a.x*a.x) + (a.y*a.y) + (a.z*a.z));
a.x = a.x/mag;
a.y = a.y/mag;
a.z = a.z/mag;
return a;
}//normalize 

Vec vecCross(Vec a, Vec b){
    Vec v;
    v.x = (a.y * b.z) - (b.y * a.z);
    v.y = (a.z * b.x) - (b.z * a.x);
    v.z = (a.x * b.y) - (b.x * a.y);
    return v;
}//vecCross

Vec vecNegate(Vec a){
    Vec v;
    v.x = -a.x;
    v.y = -a.y;
    v.z = -a.z;
    return v;
}//VecNegate

double vecDot(Vec a, Vec b){
    return (a.x * b.x) + (a.y * b.y) + (a.z * b.z);
}

Vec vecAdd(Vec a, Vec b){
    return makeVec(a.x + b.x, a.y + b.y, a.z + b.z);
}

Vec vecMult( double b, Vec a) {
    return makeVec(a.x * b, a.y * b, a.z * b);
}
//-------------------------------------------ray.h----------------------------------
typedef struct {
  Vec origin, direction;
}Ray;

Ray newRay();
Ray makeRay(Vec org, Vec dir);
//-------------------------------------------ray.c----------------------------------
Ray newRay(){
Ray r;
r.origin = makeVec(0,0,0);
r.direction = makeVec(1,0,0);
return r;
}

Ray makeRay(Vec org, Vec dir){
Ray r;
r.origin = org;
r.direction = dir;
return r;
}
//-------------------------------------------colour.h----------------------------------
typedef struct {
  double r, g, b;
}Colour;

Colour makeColour(double r, double g, double b);

//-------------------------------------------colour.c----------------------------------
Colour makeColour(double r, double g, double b){
Colour c;
c.r = r;
c.g=g;
c.b=b;
return c;
}
//-------------------------------------------light.h----------------------------------

typedef struct {
    Vec pos;
    Colour colour;
}Light;

Light makeLight(Vec pos, Colour colour);
//-------------------------------------------light.c----------------------------------
Light makeLight(Vec pos, Colour colour){
Light l;
l.pos = pos;
l.colour = colour;
return l;
}
//-------------------------------------------camera.h----------------------------------

typedef struct {
  Vec camPos, camDir, camRight, camDown;
}Camera;

Camera newCamera(Vec camPos, Vec camDir, Vec camRight, Vec camDown);

//-------------------------------------------camera.c----------------------------------

Camera newCamera(Vec camPos, Vec camDir, Vec camRight, Vec camDown){
Camera c;
c.camPos = camPos;
c.camDir = camDir;
c.camRight = camRight;
c.camDown = camDown;
return c;
}

//-------------------------------------------shpere.h----------------------------------

typedef struct {
    Vec cent;
    double rad;
    Colour colour;
}Sphere;

Sphere makeSphere(Vec cent, double rad, Colour colour);
double findInt(Ray ray, Sphere sphere);
//-------------------------------------------shpere.c----------------------------------
Sphere makeSphere(Vec cent, double rad, Colour colour){
Sphere s;
s.cent = cent;
s.rad = rad;
s.colour = colour;
return s;
}

double findInt(Ray ray, Sphere sphere){
  
    Vec temp = vecAdd(ray.origin, vecNegate(sphere.cent)); 
    float a = vecDot(ray.direction, ray.direction);
    float b = 2.0 * vecDot(temp, ray.direction);
    float c = vecDot(temp,temp) - sphere.rad*sphere.rad;
    
    double d = b*b - 4*a*c; 
    //printf("b: %f c: %f d: %f\n",b,c,d);
    if(d > 0){
    double root1 = ((-b - sqrt(d))/2*a) - 0.00001;
      return root1;
      }else
      return -1;
  }//find int

//-------------------------------------------plane.h----------------------------------
typedef struct {
    Vec normal;
    double distance;
    Colour colour;
}Plane;

Plane makePlane(Vec normal, double distance, Colour colour);

double findPlaneInt(Ray ray, Plane plane);
//-------------------------------------------plane.c----------------------------------
Plane makePlane(Vec normal, double distance, Colour colour){
Plane p;
p.normal = normal;
p.distance = distance;
p.colour = colour;
return p;
}

double findPlaneInt(Ray ray, Plane plane){
  Vec rayDir = ray.direction;
  double a = vecDot(rayDir, plane.normal);
  if(a == 0){
    return -1;
  } else{
    Vec normX = vecMult(plane.distance, plane.normal);
    normX = vecNegate(normX);
    Vec rayOrg = vecAdd(ray.origin, normX);
    double b = vecDot(plane.normal,rayOrg);
    return -1*b/a;
  }
}
//-------------------------------------------main----------------------------------



 //variables for splitting work 
int size = HEIGHT / PROCESS_NUM; 
int r = HEIGHT % PROCESS_NUM; 
int finish = HEIGHT / PROCESS_NUM;
int start = 0;
unsigned char pixels[WIDTH][HEIGHT][PIXELBYTES];

int main(){ 
 //time variables            
 struct timespec time1, time2;          
 long seconds;
 long ns;
 
//create proccess 
pid_t children[PROCESS_NUM];
 
printf("%s", "Begin image creation\n");
clock_gettime(CLOCK_PROCESS_CPUTIME_ID, &time1);

for (int i = 0 ; i < PROCESS_NUM; i++){

  pid_t pid = fork();
  
  if (!pid){
  //do computation
  rayTrace();
  exit(0);
  
  }else{
  children[i] = pid;
  start += size; 
  finish += size;
  }//else 
}
  for(int i = 0; i < PROCESS_NUM; i++){
  int status;
  waitpid(children[i], &status, 0 );
  }
  
 
printf("%s", "Image creation completed \n");
 clock_gettime(CLOCK_PROCESS_CPUTIME_ID, &time2);
 
 seconds = time2.tv_sec - time1.tv_sec; 
 ns = time2.tv_nsec - time1.tv_nsec; 
 
 if (time1.tv_nsec > time2.tv_nsec) { // clock underflow 
	--seconds; 
	ns += 1000000000; 
    } 
     
 printf("total seconds: %e\n", (double)seconds + (double)ns/(double)1000000000); 

//happens after all data is loded 
 //saves the image as an.bmp file
 makebmp(FILENAME, WIDTH, HEIGHT, pixels);
}//main

void rayTrace(){

//light variables
 Colour white = makeColour(1,1,1);
 Colour green = makeColour(0.5, 1, 0.5);
 //Vec lightPos = makeVec(0,200,0); NOT USED
 //Light theLight = makeLight(lightPos, white); NOT USED
 
 //vec variables                    
 //Vec xVec = makeVec(1,0,0); NOT USED
 Vec yVec = makeVec(0,1,0);
 //Vec zVec = makeVec(0,0,1); NOT USED
 Vec target = makeVec(0,0,0);
 
 //camera variables
 Vec camPos = makeVec(0, -10, -1);
 Vec camDir = makeVec(camPos.x - target.y, camPos.y - target.y , camPos.z - target.z);
 camDir = vecNegate(camDir);
 camDir = normalize(camDir);
 
 Vec camRight = vecCross(camDir, yVec);
 camRight = normalize(camRight);
 Vec camDown = vecCross(camDir, camRight);
 
 //scene variables
 Vec sphereLoc = makeVec(0,1,1);
 Camera theCam = newCamera(camPos, camDir, camRight, camDown);
 Sphere sphere = makeSphere(sphereLoc, 25, green);
 Plane plane = makePlane(yVec, -1, white);


for(int x = 0; x < WIDTH; x++){
  for( int y = start; y < finish; y++ ){
  
  //-------------------------------------------------------
   double xAmt = (x + 0.5)/WIDTH;
   double yAmt = ((HEIGHT - y) +0.5)/HEIGHT;
   
   Vec rayOrig = theCam.camPos;
   
   Vec camDownY = vecMult(yAmt-0.5, camDown);
   Vec camRightX = vecMult(xAmt+0.5, camRight);
   Vec temp = vecAdd (camDownY,camRightX);
   temp = vecAdd(camDir,temp);
   temp = normalize(temp);
   
   Vec rayDir = temp;
   Ray theRay = makeRay(rayOrig, rayDir);
   
   int intersections[2];
   //this is where we detect an intersection with the objects in the scene
   //this will be the most computational part of the ray tracer
   intersections[0] = findPlaneInt(theRay, plane);
   intersections[1] = findInt(theRay, sphere);
   int firstInt;
   
   if(intersections[0] == 0 && intersections[1] == 0){
   firstInt = -1;
   }else if(intersections[0]+8 > intersections[1]){
   firstInt = 1;
   }else
   firstInt = 0;
   
    //assign the appropriate colour 
  if(firstInt == 1){
  
  pixels[x][y][2] = 222;   //red
  pixels[x][y][1] = 52;   //green
  pixels[x][y][0] = 222;   //blue
  }else if(firstInt == -1){
  pixels[x][y][2] = 100;   //red
  pixels[x][y][1] = 100;   //green
  pixels[x][y][0] = 100;   //blue
  }else{
  
  pixels[x][y][2] = 255;   //red
  pixels[x][y][1] = 255;   //green
  pixels[x][y][0] = 255;   //blue
  
  }
  
   }//for(height)
  }//for (width)
}//raytrace

//makebmp will create a bmp file for the image to be seen

void makebmp (const char *filename, int w, int h, unsigned char data[WIDTH][HEIGHT][PIXELBYTES]){

  FILE *f;
  int filesize = FILEHEADERSIZE + FILEINFOSIZE  + (PIXELBYTES*w*h);
  unsigned char bmpFileHeader[FILEHEADERSIZE] = {'B','M',
                                                 filesize,filesize>>8,filesize>>16,filesize>>24,
                                                 0,0,0,0,
                                                 FILEHEADERSIZE + FILEINFOSIZE,0,0,0};


  unsigned char bmpInfoHeader[FILEINFOSIZE] = {FILEINFOSIZE,0,0,0,
                                               w,w>>8,w>>16,w>>24,
                                               h,h>>8,h>>16,h>>24,
                                               1,0,PIXELBYTES*8,0};


  f = fopen(filename, "wb");

  fwrite(bmpFileHeader, 1, FILEHEADERSIZE, f);
  fwrite(bmpInfoHeader, 1, FILEINFOSIZE, f);

  for(int x = 0; x<(w); x++){
  for(int y = 0; y<(h); y++){
  fwrite(data,1,PIXELBYTES,f);
  }
  }//for

  fclose(f);
}//makebmp

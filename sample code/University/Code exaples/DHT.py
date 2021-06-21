#!/usr/bin/python

# A4
#Jake Lund, 7797505
#DHT.py
# a simple socket server 
#--------------------imports----------------------------------
import socket
import select
import os
import sys
import random
import json 
import datetime
import copy
import pprint

#-------------------------CONSTANTS------------------------------
BOOTSTRAPID = 65535
TIMEOUTVALUE = 2

#--------------------Create the client socket --------------------
try:
    mySocket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
except socket.error, msg:
    print 'Failed to create socket. Error code: ' + str(msg[0]) + ' , Error message : ' + msg[1]
    sys.exit()
    
#----------------------VARIABLES--------------------------------
LOCALPORT = 15084
LOCALHOST = socket.gethostname()
FIRSTPORT = 15000
FIRSTHOST =  socket.gethostbyname(socket.getfqdn('silicon.cs.umanitoba.ca'))
LOCALADDRESS = (LOCALHOST, LOCALPORT)
theEnd = False
nodeID = random.randint(1, BOOTSTRAPID)
pp = pprint.PrettyPrinter(indent=1)

#--------------------Bind the client socket --------------------
try: 
    mySocket.bind(LOCALADDRESS) 
except socket.error , msg:
    print 'Bind failed. Error Code :' + str(msg[0]) + msg[1] + " wait a minute before trying again"
    sys.exit()  

#-------------------PROTOCOL METHODS------------------------------------
#sends pred? msg    
def pred(host, port): 
    predCMD = {"cmd": "pred?", "port":  LOCALPORT, "ID": nodeID, "hostname": LOCALHOST }
    message = json.dumps(predCMD)
    mySocket.sendto(message, (host,int(port)))
    return None

#sends myPred msg
def myPred(host, port, ID ,sentHost, sentPort):
    myPredCMD = {"cmd": "myPred", "me" :{ "port":  LOCALPORT, "ID": nodeID, "hostname": LOCALHOST},"thePred" : {"port":  port, "ID": ID, "hostname": host}}
    message = json.dumps(myPredCMD)
    mySocket.sendto(message, (sentHost,int(sentPort)))
    return None

#sends setPred msg
def setPred(host, port, mySucc, thePred):
    setPredCMD = {"cmd": "setPred", "port":  LOCALPORT, "ID": nodeID, "hostname": LOCALHOST}
    message = json.dumps(setPredCMD)
    print datetime.datetime.now()
    print 'My successor is now: '
    pp.pprint(mySucc)
    print 'My predecessor is now: '
    pp.pprint(thePred)
    print '\n'
    mySocket.sendto(message, (host,int(port)))
    return None

#sends find msg
def find(host, port, ID, succHost, succPort, hops, query):
    setPredCMD = {"cmd": "find", "port":  port, "ID": ID, "hostname": host, "hops": hops, "query": query}
    message = json.dumps(setPredCMD)
    mySocket.sendto(message, (succHost,int(succPort)))
    return None

#sends owner msg
def owner(host, port, ID, hops, query):
    setPredCMD = {"cmd": "owner", "port":  LOCALPORT, "ID": nodeID, "hostname": LOCALHOST, "hops": hops, "query": query}
    message = json.dumps(setPredCMD)
    mySocket.sendto(message, (host,int(port)))
    return None

# ----------------set predecessor and successor methods--------------------------------------
def setMyPred(host, port, ID):
    thePred = {"port":  port, "ID": ID, "hostname": host}
    return thePred 

def setMySucc(host, port, ID):
    mySucc = {"port":  port, "ID": ID, "hostname": host}
    return mySucc
    
#--------------------------main method--------------------------------------
def main(host, port, lastResponse):
    thePred = {"port":  0, "ID": 0, "hostname": '0'}   
    joinedRing = False
    pred(host, port)
    while not theEnd: #main loop to read in from stdin or from a socket    
        socketFD = mySocket.fileno()#file descriptor as an int
        (readFDs, writeFDs, errorFDs) = select.select( [socketFD, sys.stdin],[],[],TIMEOUTVALUE) #(default to infinity)
        if readFDs == []:
            if not joinedRing:
                if lastResponse is not None:
                    print datetime.datetime.now()
                    print "no response"
                    print 'join ring at last node that responded \n'
                    mySucc = setMySucc(lastResponse['hostname'],lastResponse['port'],lastResponse['ID'])
                    setPred(lastResponse['hostname'],lastResponse['port'], mySucc, thePred)
                    joinedRing = True
        else:
            for desc in readFDs:
                if desc == sys.stdin:
                    temp = sys.stdin.readline().rstrip()
                    if temp == '':
                        print datetime.datetime.now()
                        print 'recvd an empty string GOODBYE \n'
                        mySocket.close()
                        sys.exit();
                    elif temp.isdigit():
                        find(LOCALHOST, LOCALPORT, nodeID, mySucc['hostname'],mySucc['port'], 0, temp)
                        break
                elif desc == socketFD:
                        (messageSocket, addr) = mySocket.recvfrom(2048)
                        
                        if messageSocket == '':
                            print datetime.datetime.now()
                            print 'recvd an empty string GOODBYE \n'
                            mySocket.close()
                            sys.exit();
                        else:
                            message = json.loads(messageSocket)
                            print datetime.datetime.now() 
                            print 'Message Recvd : from ' + addr[0] + ':' + str(addr[1])  
                            pp.pprint(message)
                            print '\n'
                            if message['cmd'] == 'pred?':
                                myPred(thePred['hostname'],thePred['port'],thePred['ID'], message['hostname'], message['port'])
                                
                            elif message['cmd'] == "myPred":
                                senderArray = message['me']
                                senderPredArray = message['thePred']                                                    
                                lastResponse = copy.deepcopy(senderPredArray)            
                                if int(senderPredArray['ID']) < nodeID:
                                    print datetime.datetime.now()
                                    print 'found spot for me in the ring... join ring \n'
                                    mySucc = setMySucc(senderArray['hostname'],senderArray['port'],senderArray['ID'])
                                    setPred(senderArray['hostname'],senderArray['port'], mySucc, thePred)
                                    joinedRing = True
                                    
                                    
                                else:
                                    host = senderPredArray['hostname']
                                    port = senderPredArray['port']                                                          
                                    main(host,port,lastResponse)                                  
                            
                            elif message['cmd'] == "setPred":
                                if int(message['ID']) < nodeID:
                                    thePred = setMyPred(message['hostname'], message['port'], message['ID'])
                                else:
                                    print datetime.datetime.now() 
                                    print 'someone with higher ID tried to set my pred dont let them\n'
                                print datetime.datetime.now()    
                                print "pred has been updated to : " + str(thePred) + '\n'
                                
                            elif message['cmd'] == "find":
                                hops = int(message['hops']) + 1
                                if int(message['query']) <= nodeID:
                                    owner(message['hostname'],message['port'],message["ID"],hops, message['query'])
                                else:
                                    find(message['hostname'], message['port'],message['ID'], mySucc['hostname'],mySucc['port'], hops, message['query'])
                                
                            elif message['cmd'] == "owner":
                                print datetime.datetime.now()
                                print 'found owner of my find request'
                                print 'took ' + str(message['hops']) + ' hops to find the owner ' + message['hostname'] + ' : ' + str(message['port']) + '\n'
                                
                 
                    
    return None


# -----------------call main the first time(will be recursive)--------------------------------------
main(FIRSTHOST, FIRSTPORT, None)

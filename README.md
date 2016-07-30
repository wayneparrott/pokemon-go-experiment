# pokemon-go-experiment
Mobile augmented reality demo - launch pokeballs at pokemon characters. 
Uses ezAR, three.js, physijs and Ionic Framework.

This project demonstrates the use of free open-source augemented-reality and 3D JavaScript libraries 
to reproduce a basic example of the popular Pokemon GO mobile app. 

[![Video Introduction](https://github.com/ezartech/pokemon-go-experiment/blob/master/_research/PG-frame40.png)](https://youtu.be/wRD4F9hmrOc)  
*video introduction*

##WORK IN PROGRESS NOTES

Works on: 
    iPhone 6S (iOS 9.3)
    iPad Air (iOS 9.3)

Fails on:
    Nexus 5 (Android 6.0.1)   

I am early in the prototype stage and have implemented a rough hack 
simulating launching pokeballs at pokemon and detecting hits. Additionaly
the Pokemon GO background music plays continuously (earworm). The project 
uses three.js, physijs, tween.js and the ezAR videoOverlay and snapshot 
plugins for Cordova.  

The code is a work-in-progress and needs 
serious clean up and reorganization. This is my first real three.js project and I'm still learning
the basics. I spent minimal time on the scene layout and ball trajectory calculations 
opting instead for simple empirically derived values while iteratively improving 
the prototype.  

I plan to completely reimpl the demo once I have it working to a satisfactory level. 
See the platform limitations below for the small number of devices that I have tested 
on successfully. For the near term, please don't contact me reporting the demo 
doesn't work on your android device or versions of iOS older than 8.0 that do not 
support webgl.  

##Build##
todo

##ezAR Docs and Tech Support
See [ezartech.com](http://ezartech.com) for documentation and support.


Copyright (c) 2015-2016, ezAR Technologies

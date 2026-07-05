[Setup]
AppName=Cosplay Chess
AppVersion=1.0.2
DefaultDirName={autopf}\Cosplay Chess
DefaultGroupName=Cosplay Chess
OutputBaseFilename=CosplayChess-Setup
Compression=lzma2
SolidCompression=yes
SetupIconFile=img\favicon-Photoroom.png
OutputDir=dist\installer

[Files]
Source: "dist\Cosplay Chess-win32-x64\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Cosplay Chess"; Filename: "{app}\Cosplay Chess.exe"
Name: "{userdesktop}\Cosplay Chess"; Filename: "{app}\Cosplay Chess.exe"

📦 WFMParserGUI — Warframe.Market parser with Electron GUI

WFMParserGUI is a desktop Electron application for parsing item lists and prices from Warframe.Market. <br>
It is based on <a href="https://github.com/Exaeri/WFMarketParser">WFMarketParser</a>, but adds a full GUI with template selection, progress tracking, logs panel and built-in JSON output viewer.<br>

<img width="900" height="400" alt="image" src="https://github.com/user-attachments/assets/8c48419a-714d-480e-ba00-ff03f919ee94" />

<h3>🚀Features</h3>
✔ Electron-based desktop GUI<br>
✔ Optional summary file generation<br>
✔ Real-time logs panel for renderer and main process logs<br>
✔ Progress bar with current template progress<br>
✔ Built-in viewer for generated JSON price files<br>
✔ Open output folder directly from the app<br>

<h3>Requirements</h3>
Node.js 22+<br>
Git (required for submodules)<br>
Internet access (Warframe Market API)<br>
Windows recommended for using bundled .bat scripts<br>

<h3>📦Installation</h3>
1. <code>git clone --recursive https://github.com/Exaeri/WFMParserGUI.git</code><br><br>
2. Run installer (<code>install.bat</code>) OR do the installation manually by steps 2.1-2.3<br>
2.1 If you forgot <code>--recursive</code>, install submodules manually:<br>
<code>cd .\WFMParserGUI\</code><br>
<code>git submodule update --init --recursive</code><br>
2.2 Install root project dependencies:<br>
<code>cd .\WFMParserGUI\</code><br>
<code>npm install</code><br>
2.3 Install WFMarketApiJS dependencies:<br>
<code>cd .\WFMarketApiJS\</code><br>
<code>npm install</code><br>

<h3>Project Structure</h3>
WFMParserGUI/<br>
 ├─ parser/<br>
 │   ├─ WFMParser.js<br>
 │   ├─ templates.js<br>
 │   └─ Utils.js<br>
 ├─ src/<br>
 │   ├─ index.css<br>
 │   ├─ main.js<br>
 │   ├─ preload.js<br>
 │   └─ renderer.js<br>
 ├─ WFMarketApiJS/<br>
 │   └─ WFMApi.js<br>
 ├─ assets/<br>
 ├─ output/<br>
 │   ├─ lists/<br>
 │   └─ prices/<br>
 ├─ index.html<br>
 ├─ install.bat<br>
 ├─ start.bat<br>
 ├─ build.bat<br>
 └─ publish.bat<br>

<h3>Configuration</h3>
Pre-configured templates in <code>parser/templates.js</code>.<br>
Each template defines include/exclude tag rules that are passed into parser core methods.<br><br>
Output files are written to:<br>
<code>output/lists</code> — filtered slug lists<br>
<code>output/prices</code> — parsed and sorted prices<br>

<h3>Usage</h3>
One of the following methods:<br>
Build an app and use wfmarketparser.exe<br>
Run <code>start.bat</code><br>
<code>npm start</code><br><br>
Inside the app:<br>
1. Select one or more templates in the left panel<br>
2. Enable or disable <code>Generate summary file</code><br>
3. Press <code>Start</code><br>
4. Watch logs and progress in real time<br>
5. After parsing, inspect generated files in the output viewer<br>
Use <code>Open folder</code> to open the prices output directory<br><br>
Use <code>Stop</code> to interrupt parsing safely.<br>

<h3>Build</h3>
For a distributable build, use one of the following methods:<br>
Run <code>build.bat</code><br>
<code>npm run make</code><br><br>
This creates build in the <code>out</code> directory.<br>
<br>

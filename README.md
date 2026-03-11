Sams as <a href="https://github.com/Exaeri/WFMarketParser"> WFMarketParser </a> but with GUI via ElectronJS
<img width="900" height="400" alt="image" src="https://github.com/user-attachments/assets/8c48419a-714d-480e-ba00-ff03f919ee94" />


<h3>🚀Features</h3>
✔ todo<br>

<h3>Requirements</h3>
Node.js 18+<br>
Git (required for submodules)<br>
Internet access (Warframe Market API)

<h3>📦Installation</h3>
1. <code>git clone --recursive https://github.com/Exaeri/WFMParserGUI.git</code><br><br>
2. Run installer (install.bat) OR do the installation manually by steps 2.1-2.2<br>
2.1 Install WFMarketApi submodule:<br>
<code>cd .\WFMParserGUI\</code><br>
<code>git submodule update --init --recursive</code><br>
2.2 Install WFMarketApi dependencies:<br>
<code>cd .\WFMarketApiJS\</code><br>
<code>npm install</code><br>

<h3>Project Structure</h3>
WFMParserGUI/<br>
 ├─ Parser/<br>
 │   ├─ WFMParser.js<br>
 │   ├─ templates.js<br>    
 │   └─ Utils.js<br>
 ├─ src/<br>
 │   ├─ index.css<br>
 │   ├─ main.cjs<br> 
 │   ├─ preload.cjs<br> 
 │   └─ renderer.js<br>
 ├─ WFMarketApiJS/<br>
 │   └─ WFMApi.js<br>
 ├─ output/<br>
 │   ├─ lists/<br>
 │   └─ prices/<br>
 └─ index.html<br>

<h3>Usage</h3>

# 📄 PerfectPDF

A lightning-fast, beautifully designed, and completely stateless PDF manipulation web application. 

PerfectPDF allows users to merge multiple PDFs, delete specific pages, and visually reorder pages using an intuitive drag-and-drop interface. Built with a heavy focus on UX, it features cinematic splash animations, vibrant mesh gradients, and instant client-side previews.

## ✨ Features

- **Merge PDFs**: Seamlessly combine multiple PDF files into a single document.
- **Visual Reordering**: Drag and drop individual pages to reorder them before exporting.
- **Slice / Delete Pages**: Select and remove unwanted pages with a single click.
- **Instant Previews**: Client-side object URLs provide instantaneous PDF rendering without waiting for server responses.
- **Cinematic UI**: Vibrant mesh gradients, custom SVG iconography, 60fps animations, and a polished Material-UI design.
- **100% Serverless Ready**: The Python backend operates entirely in-memory (RAM) using `io.BytesIO`, completely avoiding disk storage to perfectly support serverless environments.

## 🛠️ Tech Stack

- **Frontend**: React.js, Material-UI (MUI), `@dnd-kit` (for drag-and-drop), Axios.
- **Backend**: Python, FastAPI, `pypdf`.
- **Deployment**: Vercel (Configured with explicit `vercel.json` routing for React static builds + Python serverless functions).

## 🚀 Running Locally

### 1. Start the Backend
Open a terminal in the root directory:
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run the FastAPI server
uvicorn api.index:app --reload --port 8000
```

### 2. Start the Frontend
Open a second terminal and navigate to the frontend folder:
```bash
cd frontend

# Install Node dependencies
npm install

# Start the React development server
npm start
```
*The frontend will launch on `http://localhost:3000` and automatically route API requests to your Python backend.*

## ☁️ Deployment (Vercel)

This project is pre-configured for seamless deployment on Vercel as a Monorepo. 
The included `vercel.json` file uses explicit `builds` to map the React static output and the FastAPI endpoints together, bypassing standard zero-config quirks. 

To deploy:
1. Push your code to GitHub.
2. Import the repository into your Vercel Dashboard.
3. Deploy! (No extra build settings required).

## 📝 License

This project is open-source and available under the MIT License.

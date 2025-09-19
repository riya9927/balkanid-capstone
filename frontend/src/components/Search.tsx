// paste the Search component you provided earlier but replace axios usage with api
import React, { useState } from "react";
import api from "../api";

interface SearchFilters { q:string; mime:string; minSize:string; maxSize:string; startDate:string; endDate:string; tags:string; uploader:string; }
interface FileResult { ID:number; Filename:string; ContentType:string; Size:number; Hash:string; DownloadCount:number; CreatedAt:string; Uploader:{Username:string} }

export default function Search(){
  const [filters, setFilters] = useState<SearchFilters>({ q:"", mime:"", minSize:"", maxSize:"", startDate:"", endDate:"", tags:"", uploader:"" });
  const [results, setResults] = useState<FileResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleFilterChange = (key: keyof SearchFilters, value: string) => setFilters(p=>({...p,[key]:value}));

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setSearched(true);
    try {
      const params = new URLSearchParams();
      (Object.entries(filters) as [keyof SearchFilters,string][])
        .forEach(([k,v]) => { if (v.trim()) params.append(k as string, v.trim()); });
      const res = await api.get(`/search?${params.toString()}`);
      setResults(res.data.files || []);
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
    } finally { setLoading(false); }
  };

  const clearFilters = () => { setFilters({ q:"", mime:"", minSize:"", maxSize:"", startDate:"", endDate:"", tags:"", uploader:"" }); setResults([]); setSearched(false); };

  const formatFileSize = (bytes:number) => {
    if (bytes===0) return "0 B";
    const k=1024; const sizes=["B","KB","MB","GB"]; const i=Math.floor(Math.log(bytes)/Math.log(k));
    return parseFloat((bytes/Math.pow(k,i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div>
      <h3>Advanced Search</h3>
      <form onSubmit={handleSearch}>
        <input placeholder="filename" value={filters.q} onChange={(e)=>handleFilterChange("q", e.target.value)}/>
        <select value={filters.mime} onChange={(e)=>handleFilterChange("mime", e.target.value)}>
          <option value="">All types</option>
          <option value="image/png">PNG</option>
          <option value="image/jpeg">JPEG</option>
          <option value="application/pdf">PDF</option>
        </select>
        <input type="number" placeholder="min size" value={filters.minSize} onChange={(e)=>handleFilterChange("minSize", e.target.value)} />
        <input type="number" placeholder="max size" value={filters.maxSize} onChange={(e)=>handleFilterChange("maxSize", e.target.value)} />
        <input type="date" value={filters.startDate} onChange={(e)=>handleFilterChange("startDate", e.target.value)} />
        <input type="date" value={filters.endDate} onChange={(e)=>handleFilterChange("endDate", e.target.value)} />
        <input placeholder="tags (comma)" value={filters.tags} onChange={(e)=>handleFilterChange("tags", e.target.value)} />
        <input placeholder="uploader" value={filters.uploader} onChange={(e)=>handleFilterChange("uploader", e.target.value)} />
        <button type="submit">{loading ? "Searching..." : "Search"}</button>
        <button type="button" onClick={clearFilters}>Clear</button>
      </form>

      {searched && (
        <div>
          <h4>Results ({results.length})</h4>
          <table className="table">
            <thead><tr><th>File</th><th>Size</th><th>Type</th><th>Uploader</th><th>Downloads</th></tr></thead>
            <tbody>
              {results.map(f => (
                <tr key={f.ID}>
                  <td>{f.Filename}</td>
                  <td>{formatFileSize(f.Size)}</td>
                  <td>{f.ContentType}</td>
                  <td>{f.Uploader?.Username}</td>
                  <td>{f.DownloadCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

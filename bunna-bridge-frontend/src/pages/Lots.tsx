import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getLots } from "../api/lots";
import { useAuth } from "../context/AuthContext";
import PageWrapper from "../components/PageWrapper";
import StatusPill from "../components/StatusPill";
import { Plus, Search, SlidersHorizontal, ShieldCheck, TrendingUp, Package, ChevronLeft, ChevronRight } from "lucide-react";

const REGIONS = ["","yirgacheffe","sidama","guji","jimma","harrar","limu","nekemte"];
const GRADES  = ["","G1","G2","G3"];
const STATUS  = ["","draft","listed","contracted","exported"];

const selectClass =
  "flex-[1_1_130px] bg-white border border-ink/8 rounded-[3px] px-3 py-[7px] text-ink font-sans text-[0.8125rem] outline-none";

export default function Lots() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isExporter = user?.role === "exporter" || user?.role === "admin";
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch]   = useState("");

  const params = { ...filters, ...(search ? { search } : {}) };
  const { data, isLoading, isError } = useQuery({
    queryKey: ["lots", params],
    queryFn:  () => getLots(params),
  });

  const setFilter = (key: string, val: string) =>
    setFilters(f => val
      ? { ...f, [key]: val }
      : Object.fromEntries(Object.entries(f).filter(([k]) => k !== key))
    );

  return (
    <PageWrapper>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-[1.75rem] font-normal text-ink mb-1">
            Coffee Lots
          </h1>
          <p className="font-mono text-[0.58rem] tracking-[0.2em] uppercase text-ink/30 m-0">
            Digital Birth Certificate Registry
          </p>
        </div>
        {isExporter && (
          <button
            onClick={() => navigate("/lots/new")}
            className="flex items-center gap-[7px] bg-forest border-none rounded-[3px] px-[18px] py-[9px] text-white font-sans text-[0.8125rem] font-medium cursor-pointer whitespace-nowrap transition-colors duration-150 hover:bg-forest-dark"
          >
            <Plus size={14} /> New Lot
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-ink/8 rounded-[3px] px-3 py-[7px] flex-[2_1_200px]">
          <Search size={13} className="text-ink/25" />
          <input
            className="bg-transparent border-none outline-none text-ink font-sans text-[0.8125rem] w-full"
            placeholder="Search lot ID, name, region..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className={selectClass} onChange={e => setFilter("region", e.target.value)}>
          <option value="">All Regions</option>
          {REGIONS.filter(Boolean).map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
        </select>
        <select className={selectClass} onChange={e => setFilter("grade", e.target.value)}>
          <option value="">All Grades</option>
          {GRADES.filter(Boolean).map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select className={selectClass} onChange={e => setFilter("status", e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS.filter(Boolean).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select className={selectClass} onChange={e => setFilter("eudr_dds_ready", e.target.value)}>
          <option value="">EUDR — All</option>
          <option value="true">EUDR Ready</option>
          <option value="false">Not Ready</option>
        </select>
      </div>

      {/* Count */}
      {data && (
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal size={12} className="text-ink/25" />
          <span className="font-mono text-[0.6rem] text-ink/30 tracking-[0.08em]">
            {data.count} lot{data.count !== 1 ? "s" : ""} found
          </span>
        </div>
      )}

      {/* States */}
      {isLoading && (
        <div className="text-center py-16 font-mono text-[0.75rem] text-ink/25">
          Loading lots...
        </div>
      )}
      {isError && (
        <div className="text-center py-16 font-mono text-[0.75rem] text-red-600">
          Failed to load lots. Check API connection.
        </div>
      )}
      {data && data.results.length === 0 && (
        <div className="text-center py-16">
          <Package size={32} className="text-ink/[0.09] mb-3 mx-auto" />
          <p className="font-mono text-[0.75rem] text-ink/25">
            No lots found.
          </p>
          {isExporter && (
            <button
              onClick={() => navigate("/lots/new")}
              className="mt-3 bg-transparent border-none font-mono text-[0.65rem] text-forest cursor-pointer tracking-[0.08em]"
            >
              Register your first lot →
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {data && data.results.length > 0 && (
        <div className="bg-white border border-ink/6 rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-ink/6">
                  {["Lot ID","Name","Region","Grade","SCA","Volume","Status","EUDR","Export"].map(h => (
                    <th
                      key={h}
                      className="font-mono text-[0.65rem] tracking-[0.12em] uppercase text-ink/50 px-4 py-3 text-left whitespace-nowrap"
                    >{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.results.map((lot, i) => (
                  <tr
                    key={lot.id}
                    onClick={() => navigate(`/lots/${lot.id}`)}
                    className={`cursor-pointer transition-colors duration-150 hover:bg-ink/[0.025] ${
                      i < data.results.length - 1 ? "border-b border-white" : ""
                    }`}
                  >
                    <td className="px-4 py-[13px] font-mono text-[0.68rem] text-coffee whitespace-nowrap">
                      {lot.lot_id}
                    </td>
                    <td className="px-4 py-[13px] font-sans text-[0.875rem] text-ink max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap">
                      {lot.name}
                    </td>
                    <td className="px-4 py-[13px] font-mono text-[0.68rem] text-ink/50 whitespace-nowrap capitalize">
                      {lot.region}
                    </td>
                    <td className="px-4 py-[13px] font-mono text-[0.68rem] text-ink/50 whitespace-nowrap">
                      {lot.grade}
                    </td>
                    <td className={`px-4 py-[13px] font-mono text-[0.72rem] whitespace-nowrap ${
                      lot.sca_score && lot.sca_score >= 85 ? "text-coffee" : "text-ink/60"
                    }`}>
                      {lot.sca_score ? `${lot.sca_score}` : "—"}
                    </td>
                    <td className="px-4 py-[13px] font-mono text-[0.68rem] text-ink/50 whitespace-nowrap">
                      {lot.volume_kg} kg
                    </td>
                    <td className="px-4 py-[13px] whitespace-nowrap">
                      <StatusPill status={lot.status} />
                    </td>
                    <td className="px-4 py-[13px] whitespace-nowrap">
                      {lot.eudr_dds_ready
                        ? <span className="flex items-center gap-1 font-mono text-[0.58rem] text-mint"><ShieldCheck size={11} /> Ready</span>
                        : <span className="font-mono text-[0.58rem] text-ink/15">—</span>
                      }
                    </td>
                    <td className="px-4 py-[13px] whitespace-nowrap">
                      {lot.export_ready
                        ? <span className="flex items-center gap-1 font-mono text-[0.58rem] text-sage"><TrendingUp size={11} /> Ready</span>
                        : <span className="font-mono text-[0.58rem] text-ink/15">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {(data.next || data.previous) && (
            <div className="px-4 py-3 border-t border-ink/5 flex gap-2 justify-end items-center">
              {data.previous && (
                <button
                  onClick={() => setFilter("page", String((parseInt(filters.page || "1") - 1)))}
                  className="flex items-center gap-1.5 bg-transparent border border-ink/9 rounded-[3px] px-3.5 py-[7px] text-ink/50 font-mono text-[0.65rem] cursor-pointer hover:border-ink/20 hover:text-ink transition-colors duration-150"
                >
                  <ChevronLeft size={12} /> Previous
                </button>
              )}
              {data.next && (
                <button
                  onClick={() => setFilter("page", String((parseInt(filters.page || "1") + 1)))}
                  className="flex items-center gap-1.5 bg-forest border-none rounded-[3px] px-3.5 py-[7px] text-white font-mono text-[0.65rem] cursor-pointer hover:bg-forest-dark transition-colors duration-150"
                >
                  Next <ChevronRight size={12} />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}

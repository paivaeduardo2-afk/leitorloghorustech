
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LogOut, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Plus, 
  User, 
  Fuel, 
  Calendar, 
  DollarSign, 
  Droplet, 
  Search, 
  AlertTriangle, 
  FileUp, 
  X, 
  FileText, 
  UploadCloud, 
  Users, 
  RotateCcw, 
  Clock, 
  CheckSquare, 
  Square,
  CreditCard,
  UserPlus
} from 'lucide-react';

// --- Types ---

type UserRole = 'admin' | 'frentista';

interface AppUser {
  id: string;
  name: string;
  role: UserRole;
  frentistaId?: string;
}

interface Refueling {
  id: string;
  id_frentista: string;
  data: string; // ISO string
  hora?: string; // Valor bruto da coluna 10
  bico: string;
  valor: number;
  litros: number;
  ownerId: string;
}

interface Employee {
  id_cartao: string;
  nome: string;
}

interface FrentistaGroup {
  displayName: string;
  cardIds: string[];
  items: Refueling[];
  totalLiters: number;
  totalValue: number;
  count: number;
}

// --- Constants ---

const MOCK_USERS: AppUser[] = [
  { id: '1', name: 'Administrador', role: 'admin' },
];

const BR_TIMEZONE = 'America/Sao_Paulo';

// --- Utilities ---

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatNumber = (val: number) => 
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Data Inválida';
  return d.toLocaleDateString('pt-BR', { timeZone: BR_TIMEZONE });
};

const getInitials = (name: string) => {
  if (!name) return '??';
  const parts = name.split(' ').filter(p => p.length > 0);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getDateOnlyString = (isoString: string): string => {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-CA', { timeZone: BR_TIMEZONE });
  } catch {
    return "";
  }
};

const parseDateRobust = (dateStr: string): string => {
  if (!dateStr) return new Date().toISOString();
  const s = dateStr.trim();
  const dmyMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1; 
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const min = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const sec = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    const d = new Date(year, month, day, hour, min, sec);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  const ymdMatch = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const hour = ymdMatch[4] ? parseInt(ymdMatch[4], 10) : 0;
    const min = ymdMatch[5] ? parseInt(ymdMatch[5], 10) : 0;
    const sec = ymdMatch[6] ? parseInt(ymdMatch[6], 10) : 0;
    const d = new Date(year, month, day, hour, min, sec);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? new Date().toISOString() : fallback.toISOString();
};

// --- Components ---

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children?: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [data, setData] = useState<Refueling[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [expandedFrentista, setExpandedFrentista] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importType, setImportType] = useState<'refueling' | 'employees'>('refueling');
  const [confirmDeleteText, setConfirmDeleteText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [filterStartDate, setFilterStartDate] = useState(''); 
  const [filterEndDate, setFilterEndDate] = useState('');     
  const [filterBico, setFilterBico] = useState('');
  
  const [selectedFrentistas, setSelectedFrentistas] = useState<string[]>([]);
  const [tempSelectedFrentistas, setTempSelectedFrentistas] = useState<string[]>([]);
  const [isFrentistaFilterOpen, setIsFrentistaFilterOpen] = useState(false);
  const frentistaDropdownRef = useRef<HTMLDivElement>(null);

  const [sortBy, setSortBy] = useState<'data' | 'bico' | 'valor'>('data');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const savedData = localStorage.getItem('abastecimentos_data');
    if (savedData) setData(JSON.parse(savedData));
    const savedEmployees = localStorage.getItem('posto_employees');
    if (savedEmployees) setEmployees(JSON.parse(savedEmployees));
    const savedUser = localStorage.getItem('abastecimentos_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser && parsedUser.role === 'admin') setCurrentUser(parsedUser);
      else localStorage.removeItem('abastecimentos_user');
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (frentistaDropdownRef.current && !frentistaDropdownRef.current.contains(event.target as Node)) {
        setIsFrentistaFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    localStorage.setItem('abastecimentos_data', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    localStorage.setItem('posto_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('abastecimentos_user', JSON.stringify(currentUser));
  }, [currentUser]);

  const login = (user: AppUser) => setCurrentUser(user);
  const logout = () => {
    setCurrentUser(null);
    setExpandedFrentista(null);
    setSelectedFrentistas([]);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterBico('');
    setSelectedFrentistas([]);
    setSortBy('data');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const hasActiveFilters = useMemo(() => {
    return filterStartDate !== '' || filterEndDate !== '' || filterBico !== '' || selectedFrentistas.length > 0;
  }, [filterStartDate, filterEndDate, filterBico, selectedFrentistas]);

  // Mapa de Cartão -> Nome
  const employeeMap = useMemo(() => {
    const map: Record<string, string> = {};
    employees.forEach(e => {
      map[e.id_cartao] = e.nome;
    });
    return map;
  }, [employees]);

  const parseCSV = (text: string, type: 'refueling' | 'employees'): any[] => {
    if (!currentUser) return [];
    // Remove BOM if exists
    const cleanText = text.replace(/^\uFEFF/, '');
    const lines = cleanText.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length < 2) return [];
    
    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';
    const headers = lines[0].toLowerCase().split(delimiter).map(h => h.trim().replace(/['"]/g, ''));
    const result: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const line = lines[i].trim();
        if (!line) continue;
        const values = line.split(delimiter).map(v => v.trim().replace(/['"]/g, ''));
        const row: any = {};
        headers.forEach((header, index) => { row[header] = values[index]; });

        if (type === 'refueling') {
          const frentistaId = values.length >= 13 ? values[12] : (row.id_frentista || row.frentista || 'N/A');
          const dateRaw = row.data || row.data_hora || row.date || row.timestamp;
          const bicoRaw = row.bico || row.id_bico || 'B?';
          const valorRaw = row.valor || row.total || row.price;
          const litrosRaw = row.litros || row.volume || row.quantidade || row.liters;
          const horaRaw = values.length >= 10 ? values[9] : '';
          const newItem: Refueling = {
            id: Math.random().toString(36).substr(2, 9) + Date.now() + i,
            id_frentista: String(frentistaId).trim(),
            data: parseDateRobust(dateRaw),
            hora: horaRaw,
            bico: String(bicoRaw),
            valor: parseFloat(String(valorRaw).replace(',', '.') || '0'),
            litros: parseFloat(String(litrosRaw).replace(',', '.') || '0'),
            ownerId: currentUser.id
          };
          if (!isNaN(newItem.valor) || !isNaN(newItem.litros)) result.push(newItem);
        } else {
          // Processamento de funcionários baseado nas colunas fornecidas: NOME;APELIDO;ID_CARTAO_ABAST;ID_CARTAO_ABAST_2;ID_CARTAO_ABAST_3
          const nome = values[0] || row.nome;
          const cartao1 = (values[2] || row.id_cartao_abast || "").trim();
          const cartao2 = (values[3] || row.id_cartao_abast_2 || "").trim();
          const cartao3 = (values[4] || row.id_cartao_abast_3 || "").trim();
          
          const cards = [cartao1, cartao2, cartao3].filter(c => c.length > 0);
          
          if (nome && cards.length > 0) {
            cards.forEach(card => {
              result.push({ id_cartao: card, nome: String(nome).trim() });
            });
          }
        }
      } catch (err) { console.warn(`Erro ao processar linha ${i + 1}:`, err); }
    }
    return result;
  };

  const handleImport = () => {
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const newItems = parseCSV(text, importType);
        if (newItems.length > 0) {
          if (importType === 'refueling') {
            setData(prev => [...prev, ...newItems]);
          } else {
            setEmployees(prev => {
              const merged = [...prev];
              newItems.forEach(item => {
                const idx = merged.findIndex(e => e.id_cartao === item.id_cartao);
                if (idx > -1) merged[idx] = item;
                else merged.push(item);
              });
              return merged;
            });
          }
          setIsImportModalOpen(false);
          setSelectedFile(null);
          setCurrentPage(1);
        } else alert("Não foi possível encontrar dados válidos no arquivo CSV.");
      };
      reader.readAsText(selectedFile);
    }
  };

  const bulkDelete = () => {
    if (confirmDeleteText.toLowerCase() === 'excluir') {
      setData([]);
      setEmployees([]);
      setIsDeleteModalOpen(false);
      setConfirmDeleteText('');
      setCurrentPage(1);
    }
  };

  const uniqueFrentistas = useMemo(() => {
    if (!currentUser) return [];
    return Array.from(new Set(data.map(item => item.id_frentista))).sort();
  }, [data, currentUser]);

  const filteredData = useMemo(() => {
    if (!currentUser) return [];
    let result = data;
    if (selectedFrentistas.length > 0) result = result.filter(item => selectedFrentistas.includes(item.id_frentista));
    if (filterStartDate || filterEndDate) {
      result = result.filter(item => {
        const itemDateStr = getDateOnlyString(item.data); 
        if (filterStartDate && itemDateStr < filterStartDate) return false;
        if (filterEndDate && itemDateStr > filterEndDate) return false;
        return true;
      });
    }
    if (filterBico) result = result.filter(item => item.bico.toLowerCase().includes(filterBico.toLowerCase()));
    return [...result].sort((a, b) => {
      let valA: any = a[sortBy];
      let valB: any = b[sortBy];
      if (sortBy === 'data') {
        valA = new Date(a.data).getTime();
        valB = new Date(b.data).getTime();
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, currentUser, filterStartDate, filterEndDate, filterBico, selectedFrentistas, sortBy, sortOrder]);

  const globalStats = useMemo(() => {
    return filteredData.reduce((acc, curr) => ({
      totalLiters: acc.totalLiters + curr.litros,
      totalValue: acc.totalValue + curr.valor,
      totalCount: acc.totalCount + 1
    }), { totalLiters: 0, totalValue: 0, totalCount: 0 });
  }, [filteredData]);

  const groupedByEmployee = useMemo(() => {
    const groups: Record<string, FrentistaGroup> = {};
    
    filteredData.forEach(item => {
      const name = employeeMap[item.id_frentista] || item.id_frentista;
      
      if (!groups[name]) {
        groups[name] = { 
          displayName: name,
          cardIds: [],
          items: [], 
          totalLiters: 0, 
          totalValue: 0, 
          count: 0 
        };
      }
      
      groups[name].items.push(item);
      groups[name].totalLiters += item.litros;
      groups[name].totalValue += item.valor;
      groups[name].count += 1;
      if (!groups[name].cardIds.includes(item.id_frentista)) {
        groups[name].cardIds.push(item.id_frentista);
      }
    });
    
    return groups;
  }, [filteredData, employeeMap]);

  const employeeEntries = (Object.entries(groupedByEmployee) as [string, FrentistaGroup][]);
  const totalPages = Math.ceil(employeeEntries.length / itemsPerPage);
  const paginatedEmployees = employeeEntries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openFrentistaFilter = () => {
    setTempSelectedFrentistas([...selectedFrentistas]);
    setIsFrentistaFilterOpen(true);
  };

  const toggleTempFrentista = (id: string) => {
    setTempSelectedFrentistas(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (tempSelectedFrentistas.length === uniqueFrentistas.length) {
      setTempSelectedFrentistas([]);
    } else {
      setTempSelectedFrentistas([...uniqueFrentistas]);
    }
  };

  const confirmFrentistaSelection = () => {
    setSelectedFrentistas([...tempSelectedFrentistas]);
    setIsFrentistaFilterOpen(false);
    setCurrentPage(1);
  };

  const cancelFrentistaSelection = () => {
    setIsFrentistaFilterOpen(false);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md border border-white">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-4 bg-indigo-600 rounded-2xl text-white mb-4 shadow-lg">
              <Fuel size={32} />
            </div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">Posto Dashboard</h1>
            <p className="text-gray-500 mt-2">Área Administrativa</p>
          </div>
          <div className="space-y-4">
            {MOCK_USERS.map(user => (
              <button key={user.id} onClick={() => login(user)} className="w-full group flex items-center p-4 bg-gray-50 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all duration-300 border border-gray-100 hover:border-indigo-400 text-left">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-indigo-600 group-hover:text-indigo-400 mr-4 shadow-sm">
                  <User size={24} />
                </div>
                <div>
                  <div className="font-bold text-gray-800 group-hover:text-white">{user.name}</div>
                  <div className="text-xs text-gray-400 group-hover:text-indigo-200 uppercase tracking-wider font-semibold">Acesso Completo</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12 font-sans text-gray-900">
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <Fuel className="text-indigo-600" size={28} />
              <span className="font-black text-xl tracking-tight hidden sm:block">POSTO PRO</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-bold">{currentUser.name}</span>
                <span className="text-xs text-gray-500 uppercase">{currentUser.role}</span>
              </div>
              <div className="h-8 w-[1px] bg-gray-200 mx-2 hidden sm:block"></div>
              <button onClick={logout} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex items-center gap-2" title="Sair">
                <LogOut size={20} />
                <span className="text-sm font-bold sm:hidden">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dashboard de Vendas</h1>
            <p className="text-gray-500">Filtrado por Frentista • Fuso: Brasil (Brasília)</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => { setImportType('refueling'); setIsImportModalOpen(true); }} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-indigo-100">
              <FileUp size={18} /> Importar Abastecimentos
            </button>
            <button onClick={() => { setImportType('employees'); setIsImportModalOpen(true); }} className="flex items-center gap-2 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm">
              <UserPlus size={18} /> Importar Funcionários
            </button>
            <button onClick={() => setIsDeleteModalOpen(true)} className="flex items-center gap-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 px-5 py-2.5 rounded-xl font-bold transition-all">
              <Trash2 size={18} /> Limpar Tudo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Droplet size={24} /></div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Volume Total</p>
              <p className="text-2xl font-black">{formatNumber(globalStats.totalLiters)} L</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-xl"><DollarSign size={24} /></div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Valor Total</p>
              <p className="text-2xl font-black">{formatCurrency(globalStats.totalValue)}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Fuel size={24} /></div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Abastecimentos</p>
              <p className="text-2xl font-black">{globalStats.totalCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-gray-800 font-bold uppercase text-xs tracking-widest">
              <Filter size={14} className="text-indigo-600" /> Filtros Avançados
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                <RotateCcw size={14} /> Limpar Filtros
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="flex flex-col gap-1.5 relative" ref={frentistaDropdownRef}>
              <label className="text-xs font-bold text-gray-500">Cartão do Frentista</label>
              <button 
                onClick={openFrentistaFilter}
                className="w-full flex items-center justify-between pl-3 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <CreditCard size={16} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">
                    {selectedFrentistas.length === 0 ? "Todos" : 
                     selectedFrentistas.length === uniqueFrentistas.length ? "Todos Selecionados" : 
                     `${selectedFrentistas.length} Selecionado(s)`}
                  </span>
                </div>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isFrentistaFilterOpen ? 'rotate-180' : ''}`} />
              </button>

              {isFrentistaFilterOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    <div 
                      onClick={toggleSelectAll}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border-b border-gray-100 mb-1"
                    >
                      {tempSelectedFrentistas.length === uniqueFrentistas.length ? 
                        <CheckSquare size={18} className="text-indigo-600" /> : 
                        <Square size={18} className="text-gray-300" />
                      }
                      <span className="text-sm font-bold text-gray-700">(Selecionar Tudo)</span>
                    </div>

                    {uniqueFrentistas.map(fId => (
                      <div 
                        key={fId} 
                        onClick={() => toggleTempFrentista(fId)}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                      >
                        {tempSelectedFrentistas.includes(fId) ? 
                          <CheckSquare size={18} className="text-indigo-600" /> : 
                          <Square size={18} className="text-gray-300" />
                        }
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-800 truncate">{employeeMap[fId] || "Desconhecido"}</span>
                          <span className="text-[10px] text-gray-400 truncate uppercase tracking-tighter">{fId}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                    <button onClick={confirmFrentistaSelection} className="flex-1 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors">OK</button>
                    <button onClick={cancelFrentistaSelection} className="flex-1 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors">Cancelar</button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500">Início</label>
              <input type="date" value={filterStartDate} onChange={(e) => { setFilterStartDate(e.target.value); setCurrentPage(1); }} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none transition-all" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500">Fim</label>
              <input type="date" value={filterEndDate} onChange={(e) => { setFilterEndDate(e.target.value); setCurrentPage(1); }} className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none transition-all" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500">Bico</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Ex: B1" value={filterBico} onChange={(e) => { setFilterBico(e.target.value); setCurrentPage(1); }} className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-indigo-500 outline-none transition-all" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-500">Ordenar</label>
              <div className="flex gap-2">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm appearance-none focus:border-indigo-500 outline-none">
                  <option value="data">Data</option>
                  <option value="bico">Bico</option>
                  <option value="valor">Valor</option>
                </select>
                <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="p-2 bg-gray-50 border border-gray-200 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                  {sortOrder === 'asc' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          {paginatedEmployees.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">Nenhum dado encontrado</h3>
              <p className="text-gray-500 mt-1">Tente importar abastecimentos ou funcionários.</p>
            </div>
          ) : (
            paginatedEmployees.map(([empName, group]) => (
              <div key={empName} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group">
                <div onClick={() => setExpandedFrentista(expandedFrentista === empName ? null : empName)} className="p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4 min-w-[250px]">
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black shadow-inner uppercase">
                      {getInitials(group.displayName)}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-800 uppercase leading-tight">{group.displayName}</h3>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {group.cardIds.map(id => (
                          <span key={id} className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-tighter">
                            {id}
                          </span>
                        ))}
                      </div>
                      <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest mt-1 opacity-70">{group.count} registros</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8 flex-1 justify-end mr-4">
                    <div className="hidden sm:block">
                      <p className="text-xs text-gray-400 font-bold uppercase mb-0.5">Litros</p>
                      <p className="font-black text-gray-700">{formatNumber(group.totalLiters)} L</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 font-bold uppercase mb-0.5">Total</p>
                      <p className="font-black text-indigo-600 text-lg">{formatCurrency(group.totalValue)}</p>
                    </div>
                  </div>
                  <div className={`transition-transform duration-300 ${expandedFrentista === empName ? 'rotate-180' : ''}`}><ChevronDown size={24} className="text-gray-400" /></div>
                </div>
                {expandedFrentista === empName && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-6 animate-in slide-in-from-top-2 duration-200">
                    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase">
                            <th className="px-6 py-4">data</th>
                            <th className="px-6 py-4 text-green-600">hora</th>
                            <th className="px-6 py-4">bico</th>
                            <th className="px-6 py-4">litros</th>
                            <th className="px-6 py-4">valor</th>
                            <th className="px-6 py-4 text-gray-400">cartão</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {group.items.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 text-sm transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <Calendar size={14} className="text-gray-400" />
                                  {formatDate(item.data)}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2 text-green-600 font-medium">
                                  <Clock size={14} className="text-green-500" />
                                  {item.hora || "--:--"}
                                </div>
                              </td>
                              <td className="px-6 py-4 font-bold text-indigo-600">{item.bico}</td>
                              <td className="px-6 py-4">{formatNumber(item.litros)} L</td>
                              <td className="px-6 py-4 font-black">{formatCurrency(item.valor)}</td>
                              <td className="px-6 py-4 text-[10px] text-gray-400 font-mono">{item.id_frentista}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl shadow-sm border border-gray-100 mb-8">
             <p className="text-sm text-gray-700 hidden sm:block">Página <span className="font-bold">{currentPage}</span> de <span className="font-bold">{totalPages}</span></p>
             <div className="flex gap-2">
                <button disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)} className="p-2 border rounded-xl disabled:opacity-50 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"><ChevronLeft size={20}/></button>
                <button disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)} className="p-2 border rounded-xl disabled:opacity-50 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"><ChevronRight size={20}/></button>
             </div>
          </div>
        )}
      </main>

      <Modal isOpen={isImportModalOpen} onClose={() => { setIsImportModalOpen(false); setSelectedFile(null); }} title={importType === 'refueling' ? "Importar Abastecimentos" : "Importar Funcionários"}>
        <div className="text-center">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full inline-flex mb-4">
            {importType === 'refueling' ? <UploadCloud size={40} /> : <Users size={40} />}
          </div>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            {importType === 'refueling' ? 
              "Selecione o arquivo CSV. O sistema detectará o ID do Frentista na Coluna 13 e tratará datas no formato (DD/MM/AAAA)." : 
              "Importe a lista de funcionários. Coluna 1: Nome, Colunas 3, 4, 5: IDs dos Cartões."
            }
          </p>
          <div className="mb-6">
            <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
            {!selectedFile ? (
              <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-200 rounded-2xl hover:border-indigo-400 hover:bg-indigo-50/30 text-gray-500 font-bold transition-all"><Plus size={20} />Escolher Arquivo CSV</button>
            ) : (
              <div className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                <span className="text-sm font-bold truncate max-w-[200px]">{selectedFile.name}</span>
                <button onClick={() => setSelectedFile(null)} className="p-1 hover:bg-indigo-100 rounded-full transition-colors"><X size={16} className="text-indigo-600" /></button>
              </div>
            )}
          </div>
          <button disabled={!selectedFile} onClick={handleImport} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 disabled:opacity-50 hover:bg-indigo-700 transition-all">Confirmar Importação</button>
        </div>
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Limpar Tudo">
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100">
            <div className="flex-shrink-0"><AlertTriangle size={32} /></div>
            <p className="text-sm font-medium">Isso removerá todos os dados (abastecimentos e frentistas). Esta ação é irreversível.</p>
          </div>
          <input type="text" placeholder="Digite EXCLUIR" value={confirmDeleteText} onChange={(e) => setConfirmDeleteText(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl uppercase font-bold focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all" />
          <button disabled={confirmDeleteText.toLowerCase() !== 'excluir'} onClick={bulkDelete} className="w-full py-3 bg-red-600 text-white rounded-xl font-black disabled:opacity-50 hover:bg-red-700 shadow-lg shadow-red-100 transition-all">EXCLUIR TUDO</button>
        </div>
      </Modal>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);

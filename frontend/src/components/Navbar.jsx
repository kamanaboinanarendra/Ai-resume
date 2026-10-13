import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FileText, PlusCircle, FolderGit2, User, LogOut, Menu, X, 
  Sparkles, Edit3, ChevronDown, Layout, Target
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAIChat } from '../context/AIChatContext';
import api from '../services/api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { setIsOpen, setIsMinimized } = useAIChat();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Resumes list for fast resume switching in the Edit dropdown
  const [resumes, setResumes] = useState([]);
  const [editDropdownOpen, setEditDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (user) {
      api.get('/resumes')
        .then((res) => setResumes(res.data || []))
        .catch(() => {});
    }
  }, [user, location.pathname]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setEditDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: FileText },
    { name: 'Available Templates', path: '/templates', icon: Layout },
    { name: 'Edit Resume', path: '/builder', icon: Edit3, isBuilder: true },
    { name: 'My Resumes', path: '/my-resumes', icon: FolderGit2 },
    { name: 'Account', path: '/account', icon: User },
  ];

  const isActive = (path) => {
    if (path === '/builder') {
      return location.pathname.startsWith('/builder') || location.pathname === '/edit-resume';
    }
    return location.pathname === path;
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E5E7EB] shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-[#D62828] flex items-center justify-center text-white shadow-sm group-hover:bg-[#A61B1B] transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-[#222222]">AI Resume</span>
              <span className="text-[#D62828] font-bold text-lg tracking-tight">Builder</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);

              if (link.isBuilder) {
                return (
                  <div key={link.path} className="relative flex items-center" ref={dropdownRef}>
                    <Link
                      to={link.path}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                        active
                          ? 'bg-[#FFF7F7] text-[#D62828] font-semibold border border-[#E5E7EB]'
                          : 'text-[#6B7280] hover:text-[#222222] hover:bg-gray-50'
                      }`}
                      title={resumes.length > 0 ? `Edit: ${resumes[0].title}` : 'Edit Resume'}
                    >
                      <Icon className={`w-4 h-4 ${active ? 'text-[#D62828]' : 'text-[#6B7280]'}`} />
                      <span>{link.name}</span>
                    </Link>

                    {resumes.length > 1 && (
                      <button
                        onClick={() => setEditDropdownOpen(!editDropdownOpen)}
                        className={`p-1.5 -ml-1 text-[#6B7280] hover:text-[#222222] hover:bg-gray-100 rounded-lg transition-colors ${
                          active ? 'text-[#D62828]' : ''
                        }`}
                        title="Select which resume to edit"
                        aria-label="Select resume to edit"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Popover for selecting resume to edit */}
                    {editDropdownOpen && resumes.length > 0 && (
                      <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95">
                        <div className="px-3.5 py-1.5 border-b border-[#E5E7EB] flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
                            Select Resume to Edit
                          </span>
                          <span className="text-[10px] text-[#D62828] font-semibold">
                            {resumes.length} saved
                          </span>
                        </div>
                        <div className="max-h-60 overflow-y-auto py-1">
                          {resumes.map((r) => (
                            <Link
                              key={r.id}
                              to={`/builder/${r.id}`}
                              onClick={() => setEditDropdownOpen(false)}
                              className="flex flex-col px-3.5 py-2 hover:bg-[#FFF7F7] text-left transition-colors group"
                            >
                              <span className="text-xs font-semibold text-[#222222] group-hover:text-[#D62828] truncate">
                                {r.title}
                              </span>
                              <span className="text-[10px] text-[#6B7280]">
                                {r.template_id} • Rev #{r.revision}
                              </span>
                            </Link>
                          ))}
                        </div>
                        <div className="pt-1.5 border-t border-[#E5E7EB] px-2 flex flex-col gap-1">
                          <Link
                            to="/templates"
                            onClick={() => setEditDropdownOpen(false)}
                            className="px-2.5 py-1.5 text-[11px] font-medium text-[#D62828] hover:bg-[#FFF7F7] rounded-lg flex items-center gap-1.5"
                          >
                            <PlusCircle className="w-3 h-3" />
                            <span>Create Another Resume</span>
                          </Link>
                          <Link
                            to="/my-resumes"
                            onClick={() => setEditDropdownOpen(false)}
                            className="px-2.5 py-1.5 text-[11px] font-medium text-[#6B7280] hover:text-[#222222] hover:bg-gray-50 rounded-lg flex items-center gap-1.5"
                          >
                            <FolderGit2 className="w-3 h-3" />
                            <span>View All in My Resumes</span>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-[#FFF7F7] text-[#D62828] font-semibold border border-[#E5E7EB]'
                      : 'text-[#6B7280] hover:text-[#222222] hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-[#D62828]' : 'text-[#6B7280]'}`} />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Header Actions */}
          <div className="hidden md:flex items-center gap-3">
            {/* ATS Resume Score Quick Button */}
            <Link
              to="/ats-checker"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#D62828] to-[#B91C1C] hover:from-[#B91C1C] hover:to-[#991B1B] text-white text-xs font-bold shadow-xs hover:shadow-md transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              title="Check your resume's ATS compatibility score"
            >
              <Target className="w-3.5 h-3.5" />
              <span>ATS Resume Score</span>
            </Link>

            {/* AI Assistant Quick Toggle */}
            <button
              onClick={() => {
                setIsOpen(true);
                setIsMinimized(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#222222] hover:bg-[#FFF7F7] hover:text-[#D62828] hover:border-[#D62828] transition-colors"
              title="Open AI Chat Assistant"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D62828]" />
              <span>AI Chat</span>
            </button>

            {/* User Greeting & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-[#E5E7EB]">
              <span className="text-xs text-[#6B7280]">
                Hello, <strong className="text-[#222222]">{user?.name?.split(' ')[0] || 'User'}</strong>
              </span>
              <button
                onClick={logout}
                className="p-2 text-[#6B7280] hover:text-[#DC2626] hover:bg-red-50 rounded-lg transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => {
                setIsOpen(true);
                setIsMinimized(false);
              }}
              className="p-2 text-[#D62828] hover:bg-[#FFF7F7] rounded-lg"
              title="AI Assistant"
            >
              <Sparkles className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#6B7280] hover:text-[#222222] hover:bg-gray-100 rounded-lg"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E5E7EB] bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
          <Link
            to="/ats-checker"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold bg-[#FFF7F7] text-[#D62828] border border-[#D62828]/30 mb-2 shadow-2xs"
          >
            <Target className="w-5 h-5 text-[#D62828]" />
            <span>ATS Resume Score</span>
          </Link>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  active
                    ? 'bg-[#FFF7F7] text-[#D62828] font-semibold'
                    : 'text-[#6B7280] hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-[#D62828]' : 'text-[#6B7280]'}`} />
                <span>{link.name}</span>
              </Link>
            );
          })}
          <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-between">
            <span className="text-xs text-[#6B7280]">{user?.email}</span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs text-[#DC2626] font-medium px-3 py-1.5 hover:bg-red-50 rounded"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

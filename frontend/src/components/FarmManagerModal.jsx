import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Sprout, 
  MapPin, 
  Trash2, 
  Edit3, 
  Check, 
  Loader2, 
  AlertCircle,
  Calendar,
  Layers,
  Droplets
} from 'lucide-react';
import FarmMapPicker from './FarmMapPicker';
import { farmAPI } from '../api';

export default function FarmManagerModal({
  isOpen,
  onClose,
  farms,
  selectedFarmId,
  onSelectFarm,
  onFarmsUpdated,
  lang = 'Telugu'
}) {
  if (!isOpen) return null;
  const isTelugu = lang === 'Telugu';

  const [viewMode, setViewMode] = useState('list'); // 'list' or 'create' or 'edit'
  const [editingFarm, setEditingFarm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State for new or editing farm
  const [formData, setFormData] = useState({
    farm_name: 'వరి చేను 2 (Plot 2)',
    crop_type: 'Rice (వరి)',
    variety: 'BPT 5204 (Samba Mahsuri)',
    area_acres: '2.5',
    area_cents: '0',
    field_survey_number: '',
    latitude: 16.9890,
    longitude: 81.7840,
    boundary_points: [],
    sowing_date: new Date().toISOString().split('T')[0],
    soil_type: 'Alluvial Soil (ఒండ్రు నేల)',
    irrigation_source: 'Canal Irrigation (కాలువ నీరు - Godavari/Krishna/Pennar)',
  });

  const handleStartCreate = () => {
    setFormData({
      farm_name: `వరి చేను ${farms.length + 1} (Plot ${farms.length + 1})`,
      crop_type: 'Rice (వరి)',
      variety: 'MTU 1010 (Cottondora Sannalu)',
      area_acres: '2.0',
      area_cents: '0',
      field_survey_number: '',
      latitude: 16.9890,
      longitude: 81.7840,
      boundary_points: [],
      sowing_date: new Date().toISOString().split('T')[0],
      soil_type: 'Alluvial Soil (ఒండ్రు నేల)',
      irrigation_source: 'Canal Irrigation (కాలువ నీరు - Godavari/Krishna/Pennar)',
    });
    setViewMode('create');
    setError('');
  };

  const handleStartEdit = (f) => {
    setEditingFarm(f);
    let parsedBoundary = [];
    try {
      if (typeof f.boundary_points === 'string' && f.boundary_points) {
        parsedBoundary = JSON.parse(f.boundary_points);
      } else if (Array.isArray(f.boundary_points)) {
        parsedBoundary = f.boundary_points;
      }
    } catch (e) {
      parsedBoundary = [];
    }

    setFormData({
      farm_name: f.farm_name,
      crop_type: f.crop_type || 'Rice (వరి)',
      variety: f.variety || 'BPT 5204',
      area_acres: String(f.area_acres),
      area_cents: String(f.area_cents || 0),
      field_survey_number: f.field_survey_number || '',
      latitude: f.latitude || 16.9890,
      longitude: f.longitude || 81.7840,
      boundary_points: parsedBoundary,
      sowing_date: f.sowing_date,
      soil_type: f.soil_type || 'Alluvial Soil (ఒండ్రు నేల)',
      irrigation_source: f.irrigation_source || 'Canal Irrigation',
    });
    setViewMode('edit');
    setError('');
  };

  const handleDelete = async (farmId) => {
    if (farms.length <= 1) {
      alert(isTelugu ? "కనీసం ఒక పొలం నమోదు ఉండాలి." : "You must keep at least one registered farm plot.");
      return;
    }
    if (!confirm(isTelugu ? "ఈ పొలం రికార్డును ఖచ్చితంగా తొలగించాలనుకుంటున్నారా?" : "Are you sure you want to remove this farm plot?")) {
      return;
    }

    setLoading(true);
    try {
      await farmAPI.delete(farmId);
      const updated = await farmAPI.getAll();
      onFarmsUpdated(updated);
      if (selectedFarmId === farmId && updated.length > 0) {
        onSelectFarm(updated[0].id);
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete farm plot.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.farm_name.trim()) {
      setError(isTelugu ? "దయచేసి పొలం పేరును నమోదు చేయండి." : "Please enter a farm plot name.");
      return;
    }
    if (!formData.area_acres || parseFloat(formData.area_acres) <= 0) {
      setError(isTelugu ? "దయచేసి సరైన విస్తీర్ణం నమోదు చేయండి." : "Please enter valid acreage.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        farm_name: formData.farm_name.trim(),
        crop_type: formData.crop_type,
        variety: formData.variety,
        area_acres: parseFloat(formData.area_acres),
        area_cents: parseFloat(formData.area_cents || 0),
        field_survey_number: formData.field_survey_number.trim() || null,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        boundary_points: JSON.stringify(formData.boundary_points),
        sowing_date: formData.sowing_date,
        soil_type: formData.soil_type,
        irrigation_source: formData.irrigation_source,
      };

      if (viewMode === 'create') {
        const created = await farmAPI.create(payload);
        const updated = await farmAPI.getAll();
        onFarmsUpdated(updated);
        onSelectFarm(created.id);
      } else if (viewMode === 'edit' && editingFarm) {
        await farmAPI.update(editingFarm.id, payload);
        const updated = await farmAPI.getAll();
        onFarmsUpdated(updated);
      }

      setViewMode('list');
    } catch (err) {
      console.error("Save error:", err);
      setError(err.response?.data?.detail || "Failed to save farm plot.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-900">
            <Sprout className="w-5 h-5 text-emerald-600" />
            <h3 className="font-extrabold text-lg">
              {isTelugu ? "రైతు పొలాల నిర్వహణ (Manage Multiple Plots)" : "Manage Farm Plots & Boundaries"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {viewMode === 'list' ? (
            /* LIST VIEW */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {isTelugu ? `మొత్తం పొలాలు (${farms.length})` : `Registered Plots (${farms.length})`}
                </span>
                <button
                  onClick={handleStartCreate}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isTelugu ? "+ కొత్త వరి చేను చేర్చండి" : "+ Add New Farm Plot"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {farms.map((f) => {
                  const isSelected = f.id === selectedFarmId;
                  return (
                    <div
                      key={f.id}
                      className={`p-4 rounded-2xl border transition relative ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{f.farm_name}</h4>
                          <span className="text-xs text-emerald-800 font-semibold">{f.variety}</span>
                        </div>
                        {isSelected && (
                          <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                            {isTelugu ? "ప్రస్తుతం ఎంపికైంది" : "Active"}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 my-3">
                        <div>
                          <span className="text-slate-400 block text-[10px]">{isTelugu ? "విస్తీర్ణం" : "Area"}</span>
                          <strong className="text-slate-800">{f.area_acres} Ac {f.area_cents > 0 ? `+${f.area_cents} Ct` : ''}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">{isTelugu ? "నాటు తేదీ" : "Sowing Date"}</span>
                          <strong className="text-slate-800">{f.sowing_date}</strong>
                        </div>
                        <div className="col-span-2 text-[11px] font-mono text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-600" />
                          <span>{f.latitude?.toFixed(4)}, {f.longitude?.toFixed(4)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                        <button
                          onClick={() => {
                            onSelectFarm(f.id);
                            onClose();
                          }}
                          className="font-bold text-emerald-700 hover:text-emerald-900"
                        >
                          {isTelugu ? "ఈ పొలం విశ్లేషణ చూడండి →" : "View Plot Analytics →"}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStartEdit(f)}
                            className="p-1 text-slate-400 hover:text-emerald-700 rounded-lg hover:bg-slate-100"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {farms.length > 1 && (
                            <button
                              onClick={() => handleDelete(f.id)}
                              className="p-1 text-slate-400 hover:text-red-700 rounded-lg hover:bg-slate-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* CREATE OR EDIT FORM VIEW */
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h4 className="font-bold text-slate-900 text-sm">
                  {viewMode === 'create'
                    ? (isTelugu ? "నూతన వరి పొలం నమోదు" : "Add New Farm Plot")
                    : (isTelugu ? "పొలం వివరాల సవరణ" : "Edit Farm Plot")}
                </h4>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  ← {isTelugu ? "జాబితాకు తిరిగి వెళ్లండి" : "Back to Plot List"}
                </button>
              </div>

              {/* Form inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isTelugu ? "పొలం పేరు / గుర్తింపు *" : "Farm Plot Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.farm_name}
                    onChange={(e) => setFormData({ ...formData, farm_name: e.target.value })}
                    placeholder="e.g. North Canal Plot"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isTelugu ? "సర్వే నంబరు" : "Survey Number"}
                  </label>
                  <input
                    type="text"
                    value={formData.field_survey_number}
                    onChange={(e) => setFormData({ ...formData, field_survey_number: e.target.value })}
                    placeholder="e.g. 142/2A"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isTelugu ? "వరి రకం *" : "Rice Variety *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.variety}
                    onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isTelugu ? "విస్తీర్ణం (ఎకరాలు) *" : "Area (Acres) *"}
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0.1"
                    required
                    value={formData.area_acres}
                    onChange={(e) => setFormData({ ...formData, area_acres: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {isTelugu ? "నాటు వేసిన తేదీ *" : "Sowing Date *"}
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.sowing_date}
                    onChange={(e) => setFormData({ ...formData, sowing_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Interactive Leaflet Map for Pin / Boundary Placement */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  {isTelugu ? "మ్యాప్‌లో పొలం స్థానం & హద్దులను గుర్తించండి (Interactive Field Geotag)" : "Geotag Field Location & Draw Boundaries"}
                </label>
                <FarmMapPicker
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  boundaryPoints={formData.boundary_points}
                  onChangeCoordinates={(lat, lng) => setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))}
                  onChangeBoundary={(pts) => setFormData(prev => ({ ...prev, boundary_points: pts }))}
                  isEditable={true}
                  lang={lang}
                  farmName={formData.farm_name}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  {isTelugu ? "రద్దు చేయండి" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow transition disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isTelugu ? "పొలాన్ని భద్రపరచండి" : "Save Plot Details"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

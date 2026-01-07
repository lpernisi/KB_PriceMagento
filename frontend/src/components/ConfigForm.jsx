import React, { useState } from 'react';
import { useMagento } from '../context/MagentoContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { AlertCircle, Loader2, Store, Key, Link, Lock } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

export const ConfigForm = () => {
  const { config, connect, loading } = useMagento();
  const [formData, setFormData] = useState({
    magentoUrl: config.magentoUrl || '',
    consumerKey: config.consumerKey || '',
    consumerSecret: config.consumerSecret || '',
    accessToken: config.accessToken || '',
    accessTokenSecret: config.accessTokenSecret || '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.magentoUrl || !formData.consumerKey || !formData.consumerSecret || 
        !formData.accessToken || !formData.accessTokenSecret) {
      setError('Compila tutti i campi');
      return;
    }

    // Validate URL format
    try {
      new URL(formData.magentoUrl);
    } catch {
      setError('URL non valido. Esempio: https://tuostore.com');
      return;
    }

    const result = await connect(
      formData.magentoUrl, 
      formData.consumerKey,
      formData.consumerSecret,
      formData.accessToken,
      formData.accessTokenSecret
    );
    
    if (!result.success) {
      setError(result.error || 'Errore di connessione');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-lg shadow-[0_4px_20px_rgba(0,0,0,0.08)] border-slate-200">
        <CardHeader className="space-y-1 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-[#002FA7] flex items-center justify-center">
              <Store className="h-5 w-5 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight font-['Chivo']">
              Magento Price Manager
            </CardTitle>
          </div>
          <CardDescription className="text-slate-500">
            Inserisci le credenziali OAuth del tuo store Magento 2
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="magentoUrl" className="text-xs uppercase tracking-widest font-bold text-slate-500">
                URL Magento
              </Label>
              <div className="relative">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="magentoUrl"
                  type="url"
                  placeholder="https://tuostore.com"
                  value={formData.magentoUrl}
                  onChange={(e) => setFormData({ ...formData, magentoUrl: e.target.value })}
                  className="pl-10 h-10 border-slate-200 focus:ring-2 focus:ring-[#002FA7]/20 focus:border-[#002FA7]"
                  data-testid="magento-url-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="consumerKey" className="text-xs uppercase tracking-widest font-bold text-slate-500">
                  Consumer Key
                </Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="consumerKey"
                    type="text"
                    placeholder="Consumer Key"
                    value={formData.consumerKey}
                    onChange={(e) => setFormData({ ...formData, consumerKey: e.target.value })}
                    className="pl-10 h-10 border-slate-200 focus:ring-2 focus:ring-[#002FA7]/20 focus:border-[#002FA7] text-sm"
                    data-testid="consumer-key-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="consumerSecret" className="text-xs uppercase tracking-widest font-bold text-slate-500">
                  Consumer Secret
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="consumerSecret"
                    type="password"
                    placeholder="Consumer Secret"
                    value={formData.consumerSecret}
                    onChange={(e) => setFormData({ ...formData, consumerSecret: e.target.value })}
                    className="pl-10 h-10 border-slate-200 focus:ring-2 focus:ring-[#002FA7]/20 focus:border-[#002FA7] text-sm"
                    data-testid="consumer-secret-input"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accessToken" className="text-xs uppercase tracking-widest font-bold text-slate-500">
                  Access Token
                </Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="accessToken"
                    type="text"
                    placeholder="Access Token"
                    value={formData.accessToken}
                    onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                    className="pl-10 h-10 border-slate-200 focus:ring-2 focus:ring-[#002FA7]/20 focus:border-[#002FA7] text-sm"
                    data-testid="access-token-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accessTokenSecret" className="text-xs uppercase tracking-widest font-bold text-slate-500">
                  Access Token Secret
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="accessTokenSecret"
                    type="password"
                    placeholder="Access Token Secret"
                    value={formData.accessTokenSecret}
                    onChange={(e) => setFormData({ ...formData, accessTokenSecret: e.target.value })}
                    className="pl-10 h-10 border-slate-200 focus:ring-2 focus:ring-[#002FA7]/20 focus:border-[#002FA7] text-sm"
                    data-testid="access-token-secret-input"
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Trova le credenziali in: Sistema → Integrazioni → La tua integrazione
            </p>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#002FA7] hover:bg-[#002FA7]/90 text-white font-semibold transition-all active:scale-[0.98]"
              data-testid="connect-button"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connessione in corso...
                </>
              ) : (
                'Connetti a Magento'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfigForm;

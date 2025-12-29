import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, CheckCircle2, Loader2, XCircle, RefreshCw, AlertCircle, ImageOff, Settings, Save } from "lucide-react";
import { useCompany } from "@/hooks/useCompany";
import { useEvolutionWhatsApp } from "@/hooks/useEvolutionWhatsApp";
import { useToast } from "@/hooks/use-toast";

export function IntegrationTab() {
  const { company, isLoading: companyLoading, updateCompany } = useCompany();
  const {
    connectionState,
    qrCode,
    pairingCode,
    isLoading,
    error,
    createInstance,
    disconnect,
    refreshQRCode,
  } = useEvolutionWhatsApp();
  const { toast } = useToast();

  const [qrImageError, setQrImageError] = useState(false);
  const [instanceName, setInstanceName] = useState("");
  const [isSavingInstance, setIsSavingInstance] = useState(false);

  // Inicializa o nome da instância quando a empresa carregar
  useState(() => {
    if (company?.evolution_instance_name) {
      setInstanceName(company.evolution_instance_name);
    }
  });

  const isConnected = connectionState === "open";
  const isConnecting = connectionState === "connecting" || connectionState === "loading";
  const hasQRCode = !!qrCode;
  const hasError = connectionState === "error";

  // Normaliza o QR Code para garantir que tenha o prefixo correto
  const getQRCodeSrc = () => {
    if (!qrCode) return '';
    if (qrCode.startsWith('data:image')) {
      return qrCode;
    }
    return `data:image/png;base64,${qrCode}`;
  };

  // Valida o nome da instância (sem espaços ou caracteres especiais)
  const validateInstanceName = (name: string) => {
    return /^[a-zA-Z0-9_-]*$/.test(name);
  };

  const handleSaveInstanceName = async () => {
    if (!instanceName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para a instância",
        variant: "destructive",
      });
      return;
    }

    if (!validateInstanceName(instanceName)) {
      toast({
        title: "Nome inválido",
        description: "Use apenas letras, números, hífens e underscores",
        variant: "destructive",
      });
      return;
    }

    setIsSavingInstance(true);
    try {
      await updateCompany.mutateAsync({
        evolution_instance_name: instanceName.toLowerCase().trim(),
      });
      toast({
        title: "Instância salva!",
        description: "O nome da instância foi configurado com sucesso",
      });
    } catch (err: any) {
      if (err.message?.includes('unique') || err.message?.includes('duplicate')) {
        toast({
          title: "Nome já em uso",
          description: "Esse nome de instância já está sendo usado por outra empresa",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao salvar",
          description: err.message || "Não foi possível salvar o nome da instância",
          variant: "destructive",
        });
      }
    } finally {
      setIsSavingInstance(false);
    }
  };

  if (companyLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card: Identificação da Instância para n8n */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Identificação da Instância</CardTitle>
          </div>
          <CardDescription>
            Nome único usado pelo n8n para identificar sua barbearia no webhook
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instance-name">Nome da Instância</Label>
            <div className="flex gap-2">
              <Input
                id="instance-name"
                placeholder="ex: minhabarbearia, barbearia-centro"
                value={instanceName || company?.evolution_instance_name || ""}
                onChange={(e) => setInstanceName(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleSaveInstanceName}
                disabled={isSavingInstance || !instanceName.trim()}
              >
                {isSavingInstance ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span className="ml-2 hidden sm:inline">Salvar</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use apenas letras, números, hífens (-) e underscores (_). Sem espaços.
            </p>
            {company?.evolution_instance_name && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Instância configurada: <code className="font-mono bg-muted px-1 rounded">{company.evolution_instance_name}</code>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card: Conexão WhatsApp */}
      <Card className={`border-2 transition-colors ${isConnected ? 'border-green-500/50 bg-green-500/5' : hasError ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-card'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className={`h-5 w-5 ${isConnected ? 'text-green-500' : hasError ? 'text-destructive' : 'text-muted-foreground'}`} />
              <CardTitle>Conexão WhatsApp</CardTitle>
            </div>
            {isConnected && (
              <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Ativo
              </Badge>
            )}
            {isConnecting && (
              <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Conectando
              </Badge>
            )}
            {hasError && (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Erro
              </Badge>
            )}
          </div>
          <CardDescription>
            {isConnected 
              ? "Seu WhatsApp está conectado e pronto para enviar notificações" 
              : isConnecting
              ? "Aguardando você escanear o QR Code..."
              : hasError
              ? "Ocorreu um erro na conexão"
              : "Conecte seu WhatsApp para enviar notificações automáticas"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Estado: Conectado */}
          {isConnected && (
            <div className="flex flex-col items-center gap-6 py-4">
              <div className="relative">
                <div className="h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-green-500 animate-pulse" />
                </div>
              </div>
              
              <div className="text-center space-y-1">
                <h3 className="text-lg font-semibold text-foreground">WhatsApp Conectado!</h3>
                <p className="text-muted-foreground flex items-center justify-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  {company?.evolution_instance_name || company?.name || "Sua Barbearia"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Pronto para enviar mensagens aos clientes
                </p>
              </div>

              <Button 
                variant="destructive" 
                onClick={disconnect}
                disabled={isLoading}
                className="mt-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Desconectar
              </Button>
            </div>
          )}

          {/* Estado: Desconectado - Mostrar botão de conectar */}
          {!isConnected && !hasQRCode && !isConnecting && (
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                <MessageCircle className="h-10 w-10 text-muted-foreground" />
              </div>
              
              <div className="text-center space-y-1">
                <h3 className="text-lg font-medium text-foreground">WhatsApp não conectado</h3>
                <p className="text-sm text-muted-foreground">
                  Conecte para enviar lembretes automáticos de agendamento
                </p>
                {hasError && error && (
                  <p className="text-sm text-destructive mt-2">
                    {error}
                  </p>
                )}
              </div>

              <Button 
                size="lg" 
                onClick={createInstance}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <MessageCircle className="h-5 w-5 mr-2" />
                )}
                {isLoading ? "Gerando QR Code..." : "Conectar WhatsApp"}
              </Button>
            </div>
          )}

          {/* Estado: Mostrando QR Code Real */}
          {hasQRCode && !isConnected && (
            <div className="flex flex-col items-center gap-6 py-4">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-semibold text-foreground">Escaneie o QR Code</h3>
                <p className="text-sm text-muted-foreground">
                  Abra o WhatsApp no seu celular e escaneie o código abaixo
                </p>
              </div>

              {/* QR Code Real */}
              <div className="w-64 h-64 border-2 border-primary/30 rounded-lg bg-white flex items-center justify-center overflow-hidden">
                {qrImageError ? (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ImageOff className="h-10 w-10" />
                    <p className="text-sm text-center px-4">Erro ao carregar QR Code</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setQrImageError(false);
                        refreshQRCode();
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Tentar novamente
                    </Button>
                  </div>
                ) : (
                  <img 
                    src={getQRCodeSrc()} 
                    alt="QR Code WhatsApp"
                    className="w-full h-full object-contain p-2"
                    onError={() => {
                      console.error('Failed to load QR image, src:', qrCode?.substring(0, 50));
                      setQrImageError(true);
                    }}
                    onLoad={() => setQrImageError(false)}
                  />
                )}
              </div>

              {/* Pairing Code (se disponível) */}
              {pairingCode && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Ou use o código:</p>
                  <p className="font-mono text-xl font-bold text-primary tracking-wider">
                    {pairingCode}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Aguardando conexão...
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={disconnect}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button 
                  variant="outline"
                  onClick={refreshQRCode}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Atualizar QR Code
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center max-w-sm">
                O status será atualizado automaticamente quando você escanear o QR Code
              </p>
            </div>
          )}

          {/* Estado: Carregando (criando instância) */}
          {connectionState === "loading" && !hasQRCode && (
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>
              
              <div className="text-center space-y-1">
                <h3 className="text-lg font-medium text-foreground">Gerando QR Code...</h3>
                <p className="text-sm text-muted-foreground">
                  Aguarde enquanto preparamos sua conexão
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

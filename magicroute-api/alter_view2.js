const sql = require('mssql');
const sqlConfig = {
  user: 'sa',
  password: 'tid@125632',
  server: 'localhost',
  database: 'startapp_magicroute',
  options: {
    instanceName: 'TIDSCI_2022',
    encrypt: false,
    trustServerCertificate: true
  }
};
sql.connect(sqlConfig).then(async () => {
  const query = `ALTER View [dbo].[Entregas]
as
Select 
	l.IDEmpresa
	,l.IDLote
	,l.DataLote
	,l.CodigoMotorista
	,le.NumeroPedido
	,le.NrNotaFiscal
	,le.DataPedido
	,le.DataEntrega
	,le.NomeCliente
	,le.NomeRecebimento
	,le.EnderecoEntrega
	,le.Bairro
	,le.Cidade
	,le.CEP
	,le.Pais
	,loc.NomeLocal LocalSaida
	,loc.Endereco EnderecoLocalSaida
	,loc.Cidade CidadeLocalSaida
	,loc.Bairro BairroLocalSaida
	,loc.CEP CepLocalSaida
	,locCheg.NomeLocal LocalChegada
	,locCheg.Endereco EnderecoLocalChegada
	,locCheg.Cidade CidadeLocalChegada
	,locCheg.Bairro BairroLocalChegada
	,locCheg.CEP CepLocalChegada
	,le.StatusEntrega
	,le.Observacoes
	,le.DataCriacao
	,le.UsuarioCriacao
	,l.Situacao
	,l.QuantidadeRoteirizacao
	,le.StatusRoteirizacao
	,l.DataUltimaRoteirizacao
	,le.SequenciaOriginal
	,le.SequenciaRoteirizada
	,vei.veiculo
	,vei.TipoCombustivel
	,vei.UrlVeiculo
	,vei.PlacaEntrega
	,l.DataSaida
	,le.DataInicioEntrega
	,le.HoraInicioEntrega
	,le.DataFinalEntrega
	,le.HoraFinalEntrega
	,le.DataEntregaExigida
	,le.HoraEntregaExigida
	,le.DataEntregaPrevista
	,le.HoraEntregaPrevista
	,le.TipoPagamento
	,le.ValorRecebido
	,le.Troco
	,le.FotoComprovanteEntrega
	,le.DocumentoRecebedor
	,le.DistanciaPrevista
	,le.TempoPrevistoEntrega
	,le.EmissaoCO2
	,le.UFEntrega
	,loc.UF UFLocalSaida
	,locCheg.UF UFLocalChegada
	,le.IDEnderecoTemporario
	,le.LatitudeEntrega
	,le.LongitudeEntrega
	,loc.Latitude LatitudeLocalSaida
	,loc.Longitude LongitudeLocalSaida
	,locCheg.Latitude LatitudeLocalChegada
	,locCheg.Longitude LongitudeLocalChegada
	,l.HoraSaidaPrevista
	,l.HoraRetornoPrevista
from startapp_magicroute..LotesEntregas LE
inner join startapp_magicroute..Lotes L
on l.IDLote = le.IDLote and l.IDEmpresa = le.IDEmpresa
left join startapp_magicroute..Locais Loc
on loc.CodigoLocal = l.CodigoLocalSaida and loc.IDEmpresa = l.IDEmpresa
left join startapp_magicroute..Locais locCheg
on locCheg.CodigoLocal = l.CodigoLocalChegada and locCheg.IDEmpresa = l.IDEmpresa
left join startapp_magicroute..veiculos vei
on vei.codigoveiculo = l.CodigoVeiculo`;

  try {
    await sql.query(query);
    console.log("View alterada com sucesso.");
  } catch (e) {
    console.error(e.message);
  }
  sql.close();
});

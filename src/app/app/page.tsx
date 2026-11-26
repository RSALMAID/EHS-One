import {
  CalendarClock,
  ChartColumn,
  ClipboardCheck,
  Clock3,
  FileWarning,
  ListChecks,
  MessagesSquare,
  ShieldCheck,
  Siren,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { BarrasMes } from "@/components/graficos/BarrasMes";
import { PiramideBird } from "@/components/graficos/PiramideBird";
import { Sparkline } from "@/components/graficos/Sparkline";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { rotuloAutorizacao } from "@/lib/autorizacoes";
import { dataBR, hoje, somarDias } from "@/lib/datas";
import { fmt, indicadores, MESES } from "@/lib/indicadores";
import { liberado, modulosLiberados } from "@/lib/modulos";
import { requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

type Kpi = { titulo: string; valor: string; detalhe: string; href: string; serie?: (number | null)[]; alerta?: boolean; icone: typeof Users };
type Vencimento = { texto: string; data: string; href: string };

const DIA = 86_400_000;

export default async function InicioPage() {
  const org = await requireOrg();
  const supabase = await createClient();
  const modulos = await modulosLiberados(org.id);
  const h = hoje();
  const ano = Number(h.slice(0, 4));
  const mesAtual = Number(h.slice(5, 7));
  const em30 = somarDias(h, 30);
  const conta = { count: "exact" as const, head: true };
  const tem = (m: string) => liberado(modulos, m);

  const [ind, trabalhadores, ultimoGrave, atrasadas, docs, cas, auts] = await Promise.all([
    indicadores(org.id, ano),
    supabase.from("workers").select("id", conta).eq("organization_id", org.id).eq("active", true),
    supabase
      .from("events")
      .select("occurred_at")
      .eq("organization_id", org.id)
      .eq("kind", "acidente_com_afastamento")
      .neq("status", "cancelado")
      .order("occurred_at", { ascending: false })
      .limit(1),
    tem("acoes")
      ? supabase
          .from("actions")
          .select("id, problem, action, due_date, plan_id")
          .eq("organization_id", org.id)
          .in("status", ["aberta", "em_andamento"])
          .lt("due_date", h)
          .order("due_date")
          .limit(6)
      : null,
    tem("documentos")
      ? supabase.from("documents").select("id, title, valid_until").eq("organization_id", org.id).gte("valid_until", h).lte("valid_until", em30)
      : null,
    tem("epi")
      ? supabase.from("ppe_items").select("id, name, ca_valid_until").eq("organization_id", org.id).gte("ca_valid_until", h).lte("ca_valid_until", em30)
      : null,
    tem("autorizacoes")
      ? supabase
          .from("work_authorizations")
          .select("id, kind, valid_until, workers(full_name)")
          .eq("organization_id", org.id)
          .is("revoked_on", null)
          .gte("valid_until", h)
          .lte("valid_until", em30)
      : null,
  ]);

  const meses = ind.meses.slice(0, mesAtual);
  const desde = ultimoGrave.data?.[0]?.occurred_at;
  const diasSem = desde ? Math.floor((Date.parse(h) - Date.parse(desde.slice(0, 10))) / DIA) : null;
  const eventosAno = ind.meses.reduce((s, m) => s + m.eventos, 0);
  const desviosAno = ind.meses.reduce((s, m) => s + m.desvios, 0);
  const p = ind.porTipo;

  const kpis: Kpi[] = [
    {
      titulo: "Dias sem acidente com afastamento",
      valor: diasSem === null ? "—" : String(diasSem),
      detalhe: desde ? `último em ${dataBR(desde.slice(0, 10))}` : "nenhum registrado",
      href: "/app/eventos",
      icone: ShieldCheck,
    },
    {
      titulo: "Taxa de frequência (TF)",
      valor: fmt(ind.tf),
      detalhe: ind.total.hht ? `${ano}, por milhão de horas` : "lance o HHT para calcular",
      href: ind.total.hht ? "/painel" : "/app/hht",
      serie: meses.map((m) => m.tf),
      icone: TrendingUp,
    },
    {
      titulo: "Taxa de gravidade (TG)",
      valor: fmt(ind.tg, 0),
      detalhe: ind.total.hht ? `${ind.total.dias} dias perdidos ou debitados` : "lance o HHT para calcular",
      href: ind.total.hht ? "/painel" : "/app/hht",
      serie: meses.map((m) => m.tg),
      icone: ChartColumn,
    },
    {
      titulo: "Eventos e desvios no ano",
      valor: String(eventosAno + desviosAno),
      detalhe: `${eventosAno} eventos · ${desviosAno} desvios`,
      href: "/app/eventos",
      serie: meses.map((m) => m.eventos + m.desvios),
      icone: Siren,
    },
    {
      titulo: "Ações abertas",
      valor: String(ind.acoes.abertas),
      detalhe: ind.acoes.atrasadas ? `${ind.acoes.atrasadas} atrasadas` : "nenhuma atrasada",
      href: "/app/acoes/todas",
      alerta: ind.acoes.atrasadas > 0,
      icone: ListChecks,
    },
    {
      titulo: "Conformidade das inspeções",
      valor: ind.inspecoes.conformidade === null ? "—" : `${ind.inspecoes.conformidade}%`,
      detalhe: `${ind.inspecoes.concluidas} concluídas · ${ind.inspecoes.naoConformidades} não conformes`,
      href: "/app/inspecoes",
      serie: ind.conformidadeMes.slice(0, mesAtual),
      icone: ClipboardCheck,
    },
    {
      titulo: "DDS realizados no ano",
      valor: String(ind.dds.realizados),
      detalhe: `${ind.dds.presencas} presenças confirmadas`,
      href: "/app/dds",
      serie: ind.ddsMes.slice(0, mesAtual),
      icone: MessagesSquare,
    },
    {
      titulo: "Trabalhadores ativos",
      valor: String(trabalhadores.count ?? 0),
      detalhe: "cadastrados na empresa",
      href: "/app/trabalhadores",
      icone: Users,
    },
  ];

  const vencimentos: Vencimento[] = [
    ...(docs?.data ?? []).map((d) => ({ texto: `Documento: ${d.title}`, data: d.valid_until!, href: `/app/documentos/${d.id}` })),
    ...(cas?.data ?? []).map((c) => ({ texto: `CA do EPI: ${c.name}`, data: c.ca_valid_until!, href: "/app/epi" })),
    ...(auts?.data ?? []).map((a) => ({
      texto: `${rotuloAutorizacao(a.kind)}: ${(a.workers as unknown as { full_name: string } | null)?.full_name ?? "—"}`,
      data: a.valid_until!,
      href: "/app/autorizacoes",
    })),
  ].sort((a, b) => a.data.localeCompare(b.data));

  const bird = [
    { nome: "Acidente com afastamento", n: p.acidente_com_afastamento ?? 0 },
    { nome: "Acidente sem afastamento", n: p.acidente_sem_afastamento ?? 0 },
    { nome: "Primeiros socorros e danos materiais", n: (p.primeiros_socorros ?? 0) + (p.incidente ?? 0) },
    { nome: "Quase acidentes", n: p.quase_acidente ?? 0 },
    { nome: "Desvios (atos e condições inseguras)", n: (p.desvio_seguranca ?? 0) + (p.desvio_ambiental ?? 0) },
  ];
  const semEventos = eventosAno + desviosAno === 0;

  const atalhos = [
    { texto: "Registrar evento", href: "/app/eventos#novo", icone: Siren, m: "eventos" },
    { texto: "Nova inspeção", href: "/app/inspecoes#novo", icone: ClipboardCheck, m: "inspecoes" },
    { texto: "Nova APR", href: "/app/apr#novo", icone: FileWarning, m: "apr_pt" },
    { texto: "Novo DDS", href: "/app/dds#novo", icone: MessagesSquare, m: "dds" },
    { texto: "Lançar HHT", href: "/app/hht", icone: Clock3, m: "hht" },
    { texto: "Plano de ação", href: "/app/acoes", icone: ListChecks, m: "acoes" },
  ].filter((a) => tem(a.m));

  return (
    <div>
      <h1 className="titulo">Início</h1>
      <p className="subtitulo">Como está a segurança na {org.name} em {ano}.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => {
          const Icone = k.icone;
          return (
            <Link key={k.titulo} href={k.href} className="group">
              <Card className="h-full p-4 transition group-hover:border-emerald-600">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-slate-500">{k.titulo}</p>
                  <Icone className="size-4 shrink-0 text-slate-400" aria-hidden />
                </div>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <p className="text-2xl font-semibold tabular-nums text-slate-900">{k.valor}</p>
                  {k.serie && <Sparkline valores={k.serie} rotulo={`${k.titulo}, mês a mês`} />}
                </div>
                <p className={`mt-1 text-xs ${k.alerta ? "font-medium text-red-700" : "text-slate-500"}`}>{k.detalhe}</p>
              </Card>
            </Link>
          );
        })}
      </div>
      {ind.total.mesesSemHht > 0 && (
        <p className="mt-2 text-xs text-amber-800">
          {ind.total.mesesSemHht} mês(es) com acidente ainda sem HHT ficam fora das taxas.{" "}
          <Link href="/app/hht" className="underline">Lançar HHT</Link>
        </p>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Eventos e desvios por mês</CardTitle>
            <CardDescription>{ano}, registros não cancelados</CardDescription>
          </CardHeader>
          <CardContent>
            {semEventos ? (
              <Vazio texto="Nenhum evento ou desvio registrado neste ano." acao="Registrar o primeiro" href="/app/eventos#novo" />
            ) : (
              <BarrasMes
                serieA="Eventos"
                serieB="Desvios"
                dados={meses.map((m) => ({ mes: MESES[m.mes], a: m.eventos, b: m.desvios }))}
              />
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pirâmide de Bird</CardTitle>
            <CardDescription>Do mais grave ao mais frequente, em {ano}</CardDescription>
          </CardHeader>
          <CardContent>
            {semEventos ? (
              <Vazio texto="A pirâmide aparece quando houver registros. Relatar quase acidentes e desvios é o que previne os acidentes." />
            ) : (
              <PiramideBird niveis={bird} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Ações atrasadas
              {ind.acoes.atrasadas > 0 && <Badge variant="critico">{ind.acoes.atrasadas}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {atrasadas?.data?.length ? (
              <ul className="divide-y divide-slate-100 text-sm">
                {atrasadas.data.map((a) => (
                  <li key={a.id}>
                    <Link href={a.plan_id ? `/app/acoes/plano/${a.plan_id}` : "/app/acoes/todas"} className="flex items-start gap-3 py-2 hover:bg-slate-50">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-slate-900">{a.action}</span>
                        <span className="block truncate text-xs text-slate-500">{a.problem}</span>
                      </span>
                      <span className="shrink-0 text-xs font-medium text-red-700">{dataBR(a.due_date)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Vazio texto="Nenhuma ação atrasada. Tudo dentro do prazo." />
            )}
            {ind.acoes.atrasadas > 6 && (
              <Link href="/app/acoes/todas" className="mt-2 inline-block text-xs text-emerald-800 underline">Ver todas as atrasadas</Link>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Vencimentos nos próximos 30 dias
              {vencimentos.length > 0 && <Badge variant="atencao">{vencimentos.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vencimentos.length ? (
              <ul className="divide-y divide-slate-100 text-sm">
                {vencimentos.slice(0, 6).map((v, i) => (
                  <li key={i}>
                    <Link href={v.href} className="flex items-center gap-3 py-2 hover:bg-slate-50">
                      <CalendarClock className="size-4 shrink-0 text-slate-400" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-slate-900">{v.texto}</span>
                      <span className="shrink-0 text-xs text-amber-800">{dataBR(v.data)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Vazio texto="Nada vence nos próximos 30 dias (documentos, CA de EPI e autorizações)." />
            )}
          </CardContent>
        </Card>
      </div>

      {atalhos.length > 0 && (
        <>
          <h2 className="mt-6 text-sm font-semibold text-slate-900">Atalhos</h2>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {atalhos.map((a) => {
              const Icone = a.icone;
              return (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-center text-xs font-medium text-slate-700 shadow-sm hover:border-emerald-600 hover:text-emerald-800"
                >
                  <Icone className="size-5 text-emerald-700" aria-hidden />
                  {a.texto}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Vazio({ texto, acao, href }: { texto: string; acao?: string; href?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
      <p className="max-w-xs">{texto}</p>
      {acao && href && <Link href={href} className="btn mt-1">{acao}</Link>}
    </div>
  );
}

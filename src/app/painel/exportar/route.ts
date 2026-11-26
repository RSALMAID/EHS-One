import { NextResponse, type NextRequest } from "next/server";
import { hoje } from "@/lib/datas";
import { TIPOS_EVENTO } from "@/lib/eventos";
import { STATUS_ACAO } from "@/lib/acoes";
import { indicadores, MESES } from "@/lib/indicadores";
import { liberado, modulosLiberados } from "@/lib/modulos";
import { ehEquipe, requireOrg } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

/** CSV com ";" e BOM, que o Excel em português abre direto com acentos. */
function csv(linhas: (string | number | null | undefined)[][]) {
  const cel = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "number" ? v.toLocaleString("pt-BR", { maximumFractionDigits: 4, useGrouping: false }) : v;
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + linhas.map((l) => l.map(cel).join(";")).join("\r\n");
}

export async function GET(req: NextRequest) {
  const org = await requireOrg();
  if (!ehEquipe(org.role) || !liberado(await modulosLiberados(org.id), "dashboard")) {
    return new NextResponse("Sem acesso", { status: 403 });
  }
  const tipo = req.nextUrl.searchParams.get("tipo") ?? "indicadores";
  const anoAtual = Number(hoje().slice(0, 4));
  const pedido = Number(req.nextUrl.searchParams.get("ano"));
  const ano = pedido >= 2000 && pedido <= anoAtual ? pedido : anoAtual;
  const supabase = await createClient();
  let linhas: (string | number | null | undefined)[][];

  if (tipo === "eventos") {
    const { data } = await supabase
      .from("events")
      .select("number, kind, status, occurred_at, location, description, lost_days, debited_days, cat_number, sectors(name)")
      .eq("organization_id", org.id)
      .gte("occurred_at", `${ano}-01-01`)
      .lt("occurred_at", `${ano + 1}-01-01`)
      .order("occurred_at");
    linhas = [
      ["Número", "Data", "Tipo", "Situação", "Setor", "Local", "Descrição", "Dias perdidos", "Dias debitados", "CAT"],
      ...((data ?? []) as unknown as {
        number: number;
        kind: string;
        status: string;
        occurred_at: string;
        location: string | null;
        description: string;
        lost_days: number | null;
        debited_days: number | null;
        cat_number: string | null;
        sectors: { name: string } | null;
      }[]).map((e) => [
        `E-${String(e.number).padStart(4, "0")}`,
        new Date(e.occurred_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
        TIPOS_EVENTO[e.kind]?.nome ?? e.kind,
        e.status,
        e.sectors?.name,
        e.location,
        e.description,
        e.lost_days,
        e.debited_days,
        e.cat_number,
      ]),
    ];
  } else if (tipo === "acoes") {
    const { data } = await supabase
      .from("actions")
      .select("number, origin, problem, action, due_date, status, closed_at, workers(full_name), action_plans(title)")
      .eq("organization_id", org.id)
      .order("number");
    linhas = [
      ["Número", "Plano", "Origem", "Problema", "Ação", "Responsável", "Prazo", "Situação", "Concluída em"],
      ...((data ?? []) as unknown as {
        number: number;
        origin: string;
        problem: string;
        action: string;
        due_date: string | null;
        status: string;
        closed_at: string | null;
        workers: { full_name: string } | null;
        action_plans: { title: string } | null;
      }[]).map((a) => [
        `#${String(a.number).padStart(4, "0")}`,
        a.action_plans?.title,
        a.origin,
        a.problem,
        a.action,
        a.workers?.full_name,
        a.due_date,
        STATUS_ACAO[a.status] ?? a.status,
        a.closed_at?.slice(0, 10),
      ]),
    ];
  } else if (tipo === "hht") {
    const { data } = await supabase
      .from("hht_records")
      .select("month, workers_count, hours_worked, notes")
      .eq("organization_id", org.id)
      .order("month");
    linhas = [
      ["Mês", "Trabalhadores", "HHT", "Observação"],
      ...(data ?? []).map((h) => [h.month.slice(0, 7), h.workers_count, Number(h.hours_worked), h.notes]),
    ];
  } else {
    const d = await indicadores(org.id, ano);
    linhas = [
      ["Mês", "Trabalhadores", "HHT", "Acidentes com lesão", "Com afastamento", "Dias perdidos + debitados", "TF", "TG"],
      ...d.meses.map((m) => [`${MESES[m.mes]}/${ano}`, m.trabalhadores, m.hht, m.comLesao, m.comAfastamento, m.dias, m.tf, m.tg]),
      [`Total ${ano}`, null, d.total.hht, d.total.comLesao, d.total.comAfastamento, d.total.dias, d.tf, d.tg],
    ];
  }

  return new NextResponse(csv(linhas), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ehs-one-${tipo}-${ano}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

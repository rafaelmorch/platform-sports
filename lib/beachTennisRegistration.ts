export type ParticipationId = "clinic1" | "clinic2" | "tournament";

export function calculateBeachTennisTotal(selected: ParticipationId[]) {
  const hasClinic1 = selected.includes("clinic1");
  const hasClinic2 = selected.includes("clinic2");
  const hasTournament = selected.includes("tournament");

  if (hasClinic1 && hasClinic2 && hasTournament) return 99.9;
  if ((hasClinic1 || hasClinic2) && hasTournament && !(hasClinic1 && hasClinic2)) return 79.9;
  if (hasClinic1 && hasClinic2 && !hasTournament) return 49.9;
  if (hasTournament && !hasClinic1 && !hasClinic2) return 59.9;
  if ((hasClinic1 || hasClinic2) && !hasTournament && !(hasClinic1 && hasClinic2)) return 29.9;

  return 0;
}

export function buildBeachTennisSummary(selected: ParticipationId[]) {
  const hasClinic1 = selected.includes("clinic1");
  const hasClinic2 = selected.includes("clinic2");
  const hasTournament = selected.includes("tournament");

  if (hasClinic1 && hasClinic2 && hasTournament) {
    return "Você selecionou o pacote completo: 2 clínicas + torneio.";
  }

  if ((hasClinic1 || hasClinic2) && hasTournament && !(hasClinic1 && hasClinic2)) {
    return "Você selecionou 1 clínica + torneio.";
  }

  if (hasClinic1 && hasClinic2 && !hasTournament) {
    return "Você selecionou as 2 clínicas.";
  }

  if (hasTournament && !hasClinic1 && !hasClinic2) {
    return "Você selecionou apenas o torneio.";
  }

  if ((hasClinic1 || hasClinic2) && !hasTournament && !(hasClinic1 && hasClinic2)) {
    return "Você selecionou apenas 1 clínica.";
  }

  return "Nenhuma opção selecionada.";
}

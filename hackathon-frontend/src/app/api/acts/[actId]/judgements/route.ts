export async function GET(request: Request, { params }: { params: Promise<{ actId: string }> }) {
  const { actId } = await params

  const judgements = [
    {
      caseNumber: "SC-2019-0045",
      caseTitle: "Bhagwandas vs. State of Maharashtra",
      judges: ["Justice N.V. Ramana", "Justice Sanjay Kishan Kaul", "Justice M.R. Shah"],
      dateOfJudgement: "2019-03-15",
      outcome: "Petitioner",
      category: "Constitutional Law",
      summarySnippet:
        "The Supreme Court held that contractual obligations cannot be vitiated by subsequent legislative amendments unless expressly stated. This landmark ruling strengthened the principle of contractual sanctity.",
      fullSummary:
        "The Supreme Court held that contractual obligations cannot be vitiated by subsequent legislative amendments unless expressly stated. This landmark ruling strengthened the principle of contractual sanctity in Indian jurisprudence. The court emphasized that freedom of contract is a fundamental principle, and any legislative intervention must be explicit and unambiguous. The judgment clarified that retrospective application of laws affecting contracts requires clear legislative intent and cannot be implied.",
      winningArguments:
        "The petitioner successfully argued that the State's retrospective amendment was beyond legislative scope and violated Article 14 of the Constitution. The petitioner demonstrated precedent from Sukhdev Singh v. State AIR 1975 SC 1331, establishing that economic legislation cannot arbitrarily eliminate contractual rights. The court found the amendment to be procedurally defective and substantively unreasonable.",
      ratioDecidendi:
        "The principle established is that legislative amendments cannot retrospectively vitiate existing contractual rights unless the legislation explicitly states such retrospective application. This principle stems from the constitutional guarantee of freedom of contract under Articles 19 and 21 of the Constitution. The ratio decidendi reinforces that rule of law requires clarity and prevents arbitrary exercise of legislative power.",
      reliefGranted:
        "The Court declared the impugned amendment to be ultra vires and void. All contracts entered into before the amendment date were declared to remain valid and enforceable.",
      citedActs: ["THE INDIAN CONTRACT ACT, 1872", "Constitution of India"],
      citedPrecedents: ["Sukhdev Singh v. State, AIR 1975 SC 1331", "Waman Rao v. Union of India, (1981) 2 SCC 362"],
    },
    {
      caseNumber: "SC-2020-0078",
      caseTitle: "Mumbai Merchants Association vs. Union of India",
      judges: ["Justice S.A. Bobde", "Justice A.S. Bopanna"],
      dateOfJudgement: "2020-06-22",
      outcome: "Respondent",
      category: "Administrative Law",
      summarySnippet:
        "The Supreme Court upheld the government's authority to regulate commercial contracts during times of national emergency. The court balanced the state's police power against contractual freedom.",
      fullSummary:
        "The Supreme Court examined the validity of emergency regulations affecting existing commercial contracts. The court acknowledged the state's inherent power to regulate commerce during crises while recognizing contractual sanctity as a constitutional value. The judgment carefully balanced competing interests and established a framework for determining when emergency powers can override contractual obligations.",
      winningArguments:
        "The Union successfully argued that emergency powers granted under Article 352 include regulatory control over contracts affecting essential commodities. The state demonstrated imminent threat to public welfare and necessity of intervention. Historical precedent was cited showing that contract law yields to public interest during declared emergencies.",
      ratioDecidendi:
        "During declared national emergencies, the state's regulatory power can temporarily supersede contractual freedom when justified by public necessity and limited in scope. Such intervention requires proportionality assessment and cannot be arbitrary or indefinite. The principle balances the rule of law with the state's obligation to protect public welfare.",
      reliefGranted:
        "The government's emergency regulations were upheld as constitutional. Merchants seeking compensation were directed to approach the redressal mechanism established by the government.",
      citedActs: ["Constitution of India", "National Disaster Management Act, 2005"],
      citedPrecedents: [
        "Minerva Mills Ltd. v. Union of India, (1980) 3 SCC 625",
        "S.R. Bommai v. Union of India, (1994) 3 SCC 1",
      ],
    },
    {
      caseNumber: "SC-2018-0156",
      caseTitle: "Amit Kumar vs. Sharma & Co. Ltd.",
      judges: ["Justice Dipak Misra", "Justice D.Y. Chandrachud"],
      dateOfJudgement: "2018-11-09",
      outcome: "Dismissed",
      category: "Commercial Law",
      summarySnippet:
        "The Supreme Court dismissed the petition finding the dispute to be purely commercial in nature and suited for arbitration. The court reiterated the importance of alternative dispute resolution mechanisms.",
      fullSummary:
        "The Supreme Court dismissed the petition on the grounds that the dispute fell squarely within the purview of commercial arbitration. The judgment emphasized India's commitment to alternative dispute resolution and encouraged parties to utilize arbitration clauses in contracts. The court noted that protracted litigation defeats the purpose of commercial transactions.",
      winningArguments:
        "The respondent successfully argued that the contract contained a valid arbitration clause which the petitioner sought to circumvent by approaching the court. The respondent cited the Arbitration and Conciliation Act, 1996 and established its applicability. The court was persuaded that dismissal would promote finality and reduce litigation.",
      ratioDecidendi:
        "Parties to a contract containing a valid arbitration clause must exhaust the arbitration process before approaching courts. This principle promotes efficiency in commercial disputes and upholds party autonomy in choosing dispute resolution mechanisms. The ratio emphasizes that courts should not interfere with contractual choices to arbitrate.",
      reliefGranted:
        "Petition dismissed. The petitioner was directed to pursue the matter through arbitration as per the contract terms.",
      citedActs: ["Arbitration and Conciliation Act, 1996", "THE INDIAN CONTRACT ACT, 1872"],
      citedPrecedents: ["Venture Global Engineering v. Rockwell International, (1989) 2 SCC 218"],
    },
  ]

  return Response.json(judgements)
}

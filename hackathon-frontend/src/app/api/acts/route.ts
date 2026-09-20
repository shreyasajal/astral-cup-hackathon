export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")

  if (query) {
    const allActs = [
      { title: "THE INDIAN CONTRACT ACT, 1872" },
      { title: "THE INDIAN PENAL CODE, 1860" },
      { title: "THE INDIAN SUCCESSION ACT, 1925" },
    ]

    const filtered = allActs.filter((act) => act.title.toLowerCase().includes(query.toLowerCase()))
    return Response.json(filtered)
  }

  // Return full acts data when no query is provided
  const acts = [
    {
      title: "THE INDIAN CONTRACT ACT, 1872",
      year: "1872",
      purpose:
        "To define and amend certain parts of the law relating to contracts. This act establishes the fundamental principles of contract formation, performance, and remedies in India.",
      category: "Contract Law",
      keySections: [
        {
          number: "1",
          title: "Extent and commencement",
          description: "Defines the scope and application of the act across India.",
        },
        {
          number: "2",
          title: "Definitions",
          description:
            "Establishes key terms used throughout the act including 'offer', 'acceptance', 'consideration'.",
        },
        {
          number: "10",
          title: "Who may contract",
          description:
            "Specifies parties capable of entering into contracts, including age and competency requirements.",
        },
        {
          number: "14",
          title: "Acceptance must be absolute",
          description: "An acceptance must be unqualified and unconditional to form a valid contract.",
        },
        {
          number: "31",
          title: "Effect of conditional performance",
          description: "Deals with contracts where performance is conditional upon the occurrence of an event.",
        },
      ],
    },
    {
      title: "THE INDIAN PENAL CODE, 1860",
      year: "1860",
      purpose:
        "To provide a general penal code for India. Defines criminal offences and prescribes punishments for violations.",
      category: "Criminal Law",
      keySections: [
        {
          number: "34",
          title: "Acts of several persons in furtherance of common intention",
          description: "When several persons act in furtherance of common intention, each is liable for the act.",
        },
        {
          number: "304",
          title: "Causing death by negligence",
          description: "Defines culpable homicide not amounting to murder through gross negligence.",
        },
        {
          number: "420",
          title: "Cheating and dishonestly inducing delivery of property",
          description: "Establishes penalties for fraudulent deception and misrepresentation.",
        },
      ],
    },
    {
      title: "THE INDIAN SUCCESSION ACT, 1925",
      year: "1925",
      purpose:
        "To consolidate the law applicable to intestate and testamentary succession in India. Governs inheritance and distribution of property.",
      category: "Succession Law",
      keySections: [
        {
          number: "30",
          title: "Testamentary succession",
          description: "Rules governing inheritance through wills and testaments.",
        },
        {
          number: "32",
          title: "Intestate succession",
          description: "Rules for inheritance when no valid will exists.",
        },
        {
          number: "57",
          title: "Application of certain provisions of Part to a class of wills",
          description: "Special provisions for certain types of wills.",
        },
      ],
    },
    {
      title: "THE SALE OF GOODS ACT, 1930",
      year: "1930",
      purpose:
        "To define and amend the law relating to the sale of goods. Establishes rights and obligations of buyers and sellers.",
      category: "Commercial Law",
      keySections: [
        {
          number: "4",
          title: "Sale and agreement to sell",
          description: "Distinguishes between sale and agreement to sell.",
        },
        {
          number: "16",
          title: "Sale by description",
          description: "Rules for sales where goods are described but not seen.",
        },
        {
          number: "20",
          title: "Property passes when intended to pass",
          description: "Determines when ownership transfers from seller to buyer.",
        },
      ],
    },
    {
      title: "THE NEGOTIABLE INSTRUMENTS ACT, 1881",
      year: "1881",
      purpose:
        "To define and amend the law relating to promissory notes, bills of exchange and cheques. Governs commercial paper transactions.",
      category: "Commercial Law",
      keySections: [
        {
          number: "4",
          title: "Promissory note",
          description: "Definition and requirements of promissory notes.",
        },
        {
          number: "5",
          title: "Bill of exchange",
          description: "Definition and requirements of bills of exchange.",
        },
        {
          number: "6",
          title: "Cheque",
          description: "Definition and requirements of cheques.",
        },
      ],
    },
    {
      title: "THE INFORMATION TECHNOLOGY ACT, 2000",
      year: "2000",
      purpose:
        "To provide legal recognition for transactions carried out by means of electronic data interchange and other means of electronic communication.",
      category: "Technology Law",
      keySections: [
        {
          number: "3",
          title: "Digital signature",
          description: "Legal recognition of digital signatures.",
        },
        {
          number: "43",
          title: "Penalty for damage to computer, computer system",
          description: "Penalties for unauthorized access and damage to computer systems.",
        },
        {
          number: "66",
          title: "Computer related offences",
          description: "Offences related to computers and data.",
        },
      ],
    },
    {
      title: "THE COMPANIES ACT, 2013",
      year: "2013",
      purpose:
        "To consolidate and amend the law relating to companies. Governs incorporation, management, and dissolution of companies.",
      category: "Corporate Law",
      keySections: [
        {
          number: "2",
          title: "Definitions",
          description: "Key terms used in the act including company, director, shareholder.",
        },
        {
          number: "3",
          title: "Formation of company",
          description: "Requirements and procedures for incorporating a company.",
        },
        {
          number: "149",
          title: "Board of Directors",
          description: "Composition and powers of the board of directors.",
        },
      ],
    },
    {
      title: "THE CONSUMER PROTECTION ACT, 2019",
      year: "2019",
      purpose:
        "To provide for protection of the interests of consumers and for the establishment of consumer councils and authorities for settlement of consumer disputes.",
      category: "Consumer Law",
      keySections: [
        {
          number: "2",
          title: "Definitions",
          description: "Defines consumer, goods, services, and related terms.",
        },
        {
          number: "35",
          title: "Consumer Disputes Redressal Commission",
          description: "Establishment and powers of consumer dispute redressal commissions.",
        },
        {
          number: "38",
          title: "Jurisdiction of District Commission",
          description: "Powers and jurisdiction of district level commissions.",
        },
      ],
    },
    {
      title: "THE PATENTS ACT, 1970",
      year: "1970",
      purpose:
        "To amend and consolidate the law relating to patents. Governs grant and protection of patents in India.",
      category: "Intellectual Property Law",
      keySections: [
        {
          number: "2",
          title: "Definitions",
          description: "Key terms including patent, invention, and patentee.",
        },
        {
          number: "3",
          title: "What are not inventions",
          description: "Exclusions from patentability.",
        },
        {
          number: "10",
          title: "Contents of specifications",
          description: "Requirements for patent specifications.",
        },
      ],
    },
    {
      title: "THE INDIAN EVIDENCE ACT, 1872",
      year: "1872",
      purpose:
        "To consolidate, define and amend the law of Evidence. Establishes rules for admissibility and evaluation of evidence in legal proceedings.",
      category: "Evidence Law",
      keySections: [
        {
          number: "3",
          title: "Interpretation clause",
          description: "Definitions of key terms including evidence, fact, and relevant.",
        },
        {
          number: "5",
          title: "Evidence may be given of facts in issue and relevant facts",
          description: "Scope of admissible evidence.",
        },
        {
          number: "101",
          title: "Burden of proof",
          description: "Rules regarding burden of proof in legal proceedings.",
        },
      ],
    },
  ]

  return Response.json(acts)
}

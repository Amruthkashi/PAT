// ============================================================================
// AI POLICY REVIEW - QUESTION BANK BY SECTION
// ============================================================================
// To add new questions to any section, follow the template structure below.
// You can add more sections or add items to existing sections!

export const QUESTIONS_BY_SECTION = {
  // --------------------------------------------------------------------------
  // SECTION 1: POLICIES
  // --------------------------------------------------------------------------
  'Policies': {
    standardTitle: "STANDARD 1 : The organization’s policies communicate zero tolerance for abuse.",
    items: [
      {
        id: 'P1',
        component: 'The organization has a policy prohibiting the abuse or mistreatment of consumers.',
        criticalLevel: 'Non Critical', // Options: 'Critical' or 'Non Critical'
        criteria: [
          {
            id: 'p1_c1',
            label: 'Does the organization have a written policy that prohibits abuse or mistreatment of consumers?'
          },
          {
            id: 'p1_c2',
            label: 'Are employees and volunteers informed about this policy?'
          }
        ],
        rationaleText: 'Cooperation with administrative and judicial authorities is crucial to establish accountability. Failing to document a cooperation mandate can invalidate organizational liability insurance and expose the system to legal fines.'
      },
      {
        id: 'P2',
        component: 'The organization has a policy prohibiting abuse or mistreatment of one consumer by another consumer. ',
        criticalLevel: 'Critical',
        criteria: [
          {
            id: 'p2_c1',
            label: 'Does the organization have a policy to prevent consumer-to-consumer abuse?'
          },
          {
            id: 'p2_c2',
            label: 'Are procedures in place to report and address consumer-to-consumer abuse?'
          }
        ],
        rationaleText: 'Obtaining written confirmation of reporting duties is an essential compliance control. This forms a legal bind and protects the organization during external audits.'
      },
      {
        id: 'P3',
        component: 'The organization annually reviews all abuse prevention policies for relevance, utility, and necessity and modifies as appropriate. ',
        criticalLevel: 'Non Critical',
        criteria: [
          {
            id: 'p3_c1',
            label: 'Are abuse prevention policies reviewed at least once every year?'
          },
          {
            id: 'p3_c2',
            label: 'Are policies updated when changes or improvements are identified?'
          }
        ],
        rationaleText: 'Internal investigations can be stalled if employees refuse to cooperate. A pre-signed commitment establishes clear expectations and forms a solid contractual basis for termination.'
      },
      {
        id: 'P4',
        component: 'The organization requires all employees and volunteers to sign a statement indicating that they have read and agree to comply with all organization policies upon hire and annually.',
        criticalLevel: 'Non Critical',
        criteria: [
          {
            id: 'p4_c1',
            label: 'Do all new employees and volunteers sign a policy compliance statement upon joining?'
          },
          {
            id: 'p4_c2',
            label: 'Are employees and volunteers required to renew their signed policy compliance statement every year?'
          }
        ],
        rationaleText: 'Annual policy reviews ensure that safety standards remain compliant with current legal statutes and address newly identified risks.'
      }
    ]
  },

  // --------------------------------------------------------------------------
  // SECTION 2: TRAINING
  // --------------------------------------------------------------------------
  'Training': {
    standardTitle: "STANDARD 2 : The organization trains employees and high-access volunteers to equip them with the knowledge and skills necessary for preventing and responding to abuse.",
    items: [
      {
        id: 'T1',
        component: 'The organization requires all employees and high-access volunteers to complete foundational abuse prevention training prior to having access to consumers.',
        criticalLevel: 'Critical',
        criteria: [
          {
            id: 't1_c1',
            label: 'Do all employees and high-access volunteers complete abuse prevention training before working with consumers?'
          },
          {
            id: 't1_c2',
            label: 'Is completion of the training documented before access to consumers is granted?'
          }
        ],
        rationaleText: 'Foundational training prior to consumer access ensures that all staff understand boundary rules and abuse prevention protocols before any contact occurs.'
      },
      {
        id: 'T2',
        component: 'The organization requires all employees and high-access volunteers to complete abuse prevention training annually.',
        criticalLevel: 'Non Critical',
        criteria: [
          {
            id: 't2_c1',
            label: 'Are employees and high-access volunteers required to complete abuse prevention training every year?'
          },
          {
            id: 't2_c2',
            label: 'Does the organization maintain records of annual training completion?'
          }
        ],
        rationaleText: 'Annual training refreshers ensure that abuse prevention standards remain active and updated across the workforce.'
      },
      {
        id: 'T3',
        component: 'The organization requires all employees and high-access volunteers to complete training in how to respond to boundary violations and allegations or incidents of abuse.',
        criticalLevel: 'Critical',
        criteria: [
          {
            id: 't3_c1',
            label: 'Does the training cover how to identify and respond to boundary violations?'
          },
          {
            id: 't3_c2',
            label: 'Are employees and high-access volunteers trained on reporting allegations or incidents of abuse?'
          }
        ],
        rationaleText: 'Proper training on identifying boundary violations and reporting procedures ensures immediate action upon any suspicion or incident.'
      },
      {
        id: 'T4',
        component: 'The organization requires all employees and high-access volunteers to complete training on effective monitoring and supervision practices for managing consumers and high-risk activities.',
        criticalLevel: 'Non Critical',
        criteria: [
          {
            id: 't4_c1',
            label: 'Does the organization provide training on monitoring and supervising consumers effectively?'
          },
          {
            id: 't4_c2',
            label: 'Does the training include supervision practices for high-risk activities?'
          }
        ],
        rationaleText: 'Supervision training equips personnel with practical strategies to mitigate risks during high-risk consumer activities.'
      }
    ]
  },

  // --------------------------------------------------------------------------
  // SECTION 3: INTERNAL FEEDBACK SYSTEMS
  // --------------------------------------------------------------------------
  'Internal Feedback Systems': {
    standardTitle: "STANDARD 3 :  The organization has mechanisms in place for reporting concerns, complaints, or grievances.",
    items: [
      {
        id: 'I1',
        component: 'The organization provides employees and volunteers with a grievance procedure.',
        criticalLevel: 'Critical',
        criteria: [
          {
            id: 'i1_c1',
            label: 'Does the organization provide employees and volunteers with a documented grievance procedure?'
          },
          {
            id: 'i1_c2',
            label: 'Are employees and volunteers informed about how to submit a grievance?'
          }
        ],
        rationaleText: 'A documented grievance procedure ensures staff and volunteers have clear, protected channels to report workplace concerns.'
      },
      {
        id: 'I2',
        component: 'The organization provides parents/guardians with a grievance procedure.',
        criticalLevel: 'Non Critical',
        criteria: [
          {
            id: 'i2_c1',
            label: 'Are parents/guardians provided with a grievance procedure?'
          },
          {
            id: 'i2_c2',
            label: 'Do parents/guardians know how and where to report concerns or complaints?'
          }
        ],
        rationaleText: 'Providing parents and guardians with grievance procedures fosters transparency and trust across the community.'
      },
      {
        id: 'I3',
        component: 'The organization provides consumers with a grievance procedure.',
        criticalLevel: 'Critical',
        criteria: [
          {
            id: 'i3_c1',
            label: 'Are consumers provided with an easy-to-understand grievance procedure?'
          },
          {
            id: 'i3_c2',
            label: 'Can consumers report complaints or concerns without fear of retaliation?'
          }
        ],
        rationaleText: 'An accessible grievance mechanism empowers consumers to raise concerns safely and securely.'
      }
    ]
  },

  // --------------------------------------------------------------------------
  // SECTION 4: ADMINISTRATIVE PRACTICES
  // --------------------------------------------------------------------------
  'Administrative Practices': {
    standardTitle: "STANDARD 4 : The organization's abuse risk management standards are consistently in place across all programs.",
    items: [
      {
        id: 'A1',
        component: 'The organization has a point person or committee to manage all abuse prevention efforts.',
        criticalLevel: 'Critical',
        criteria: [
          {
            id: 'a1_c1',
            label: 'Has the organization assigned a person or committee to oversee abuse prevention?'
          },
          {
            id: 'a1_c2',
            label: 'Are the roles and responsibilities of the point person or committee clearly defined?'
          }
        ],
        rationaleText: 'Designating a dedicated oversight individual or committee ensures focused accountability for abuse prevention efforts.'
      },
      {
        id: 'A2',
        component: 'The organization monitors compliance with operational standards.',
        criticalLevel: 'Non Critical',
        criteria: [
          {
            id: 'a2_c1',
            label: 'Does the organization regularly monitor compliance with operational standards?'
          },
          {
            id: 'a2_c2',
            label: 'Are compliance checks documented and reviewed?'
          }
        ],
        rationaleText: 'Regular compliance monitoring verifies that operational standards are consistently implemented across programs.'
      },
      {
        id: 'A3',
        component: 'The organization responds quickly to drift from operational standards.',
        criticalLevel: 'Critical',
        criteria: [
          {
            id: 'a3_c1',
            label: 'Does the organization identify and address non-compliance with operational standards promptly?'
          },
          {
            id: 'a3_c2',
            label: 'Are corrective actions taken and documented when standards are not followed?'
          }
        ],
        rationaleText: 'Prompt corrective action prevents operational drift from escalating into safety vulnerabilities.'
      },
      {
        id: 'A4',
        component: 'The organization has a written procedure for selecting and approving new programs and services.',
        criticalLevel: 'Non Critical',
        criteria: [
          {
            id: 'a4_c1',
            label: 'Does the organization have a documented procedure for approving new programs and services?'
          },
          {
            id: 'a4_c2',
            label: 'Are new programs and services reviewed and approved before implementation?'
          }
        ],
        rationaleText: 'Formal review and approval procedures ensure risk assessments are completed before launching new initiatives.'
      }
    ]
  }
};

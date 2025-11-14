# Prompts NuExtract pour test manuel sur la plateforme SaaS

**Date d'extraction** : 2025-11-14
**Nombre de prompts** : 4

---

## Prompt 1 : /method

### Instructions pour tester sur NuExtract.ai

1. Aller sur https://nuextract.ai
2. Créer un nouveau projet ou utiliser le projet existant
3. Utiliser l'API `/api/projects/{projectId}/infer-text` ou l'interface web
4. Coller le prompt complet ci-dessous

### Prompt complet

## Block: /method
### Extraction Instructions
- Extract the version (hermesVersion) and publication date (publicationDate) of the HERMES method from the homepage
- Publication date must be in ISO 8601 format: YYYY-MM-DD
- The publication date for HERMES 2022 is always 2023-04-01
- The publication date for HERMES 5 is always 2013-04-22
- The publication date for HERMES 5.1 is always 2014-06-03
- Extract the name and a very synthetic description (overview) of the HERMES method from the homepage
- The overview must be factual, 20 characters minimal length, 250 characters maximum length, plain text English
### Text Content from https://www.hermes.admin.ch/en/
```text
HERMES Online
HERMES 2022 project management
For structured execution of a project with classic or agile implementation. The method can be adapted to the size and complexity of your project using user-defined scenarios
```

---

## Prompt 2 : /concepts

### Instructions pour tester sur NuExtract.ai

1. Aller sur https://nuextract.ai
2. Créer un nouveau projet ou utiliser le projet existant
3. Utiliser l'API `/api/projects/{projectId}/infer-text` ou l'interface web
4. Coller le prompt complet ci-dessous

### Prompt complet

## Block: /concepts
### Extraction Instructions
- Extract comprehensive overview of HERMES project management method from the two referenced pages
- FINALITY: Extract what HERMES aims to achieve - steering, management, and execution of projects with outcome-focused approach
- SCOPE: Extract specific domain covered - project management (traditional and agile) vs domains out of scope (portfolio management, application management)
- STRUCTURAL COMPONENTS: Extract and explain the main building blocks - phases (lifecycle stages), scenarios (situation-specific configurations), modules (functional groupings), tasks (work units), results (deliverables), roles (responsibilities)
- PHASE STRUCTURE: Extract phase hierarchy - 1=Initiation (project start), 2=Execution (solution development with 2.1=Concept, 2.2=Implementation, 2.3=Deployment), 3=Closure (project end). Explain how phases structure the project lifecycle
- SCENARIOS: Extract what scenarios are and their purpose - predefined configurations for different project situations, how they adapt HERMES to specific contexts
- MODULES: Extract what modules are - thematic groupings of tasks that organize work across scenarios, their role in structuring activities
- TASKS: Extract what tasks are - discrete work units executed within modules, how they relate to results and roles
- RESULTS: Extract what results are - deliverables produced by tasks, their role as project outcomes and decision points
- ROLES: Extract what roles are - responsibilities assigned to stakeholders, how they interact with tasks and results
- RELATIONSHIPS: Extract how these components interact - how scenarios combine modules, how modules group tasks, how tasks produce results and involve roles
- GOVERNANCE: Extract governance mechanisms - milestones, quality gates, release decisions, how HERMES ensures project control and quality assurance
- METHODOLOGY CHARACTERISTICS: Extract key features - modularity (adaptable configuration), uniformity (consistent interfaces), flexibility (traditional/agile support), scalability (different project sizes)
- TRADITIONAL APPROACH: Extract how HERMES supports traditional project management - sequential phases, comprehensive planning upfront, waterfall execution
- AGILE APPROACH: Extract how HERMES supports agile methods - iterative execution, incremental delivery, adaptive planning
- HYBRID APPROACH: Extract how HERMES accommodates hybrid methodologies - combining traditional and agile elements, flexibility in approach selection
- OUTCOME FOCUS: Extract HERMES emphasis on outcomes - deliverable-driven approach, results as success criteria, outcome-based project control
- ADAPTABILITY: Extract how HERMES adapts to different contexts - scenario selection, module configuration, task tailoring
- CONSISTENCY: Extract how HERMES ensures consistency - standard terminology, uniform phase structure, common interfaces between components
- Target length: 300-500 words (≈ 1800-3000 characters). Extract only information explicitly present on the two referenced pages
- Output: plain text (no Markdown formatting). Site language (English). Factual, neutral style, without extrapolation
- Construct a flowing narrative that integrates all extracted elements into a coherent overview of the methodology as a whole
### Text Content from https://www.hermes.admin.ch/en/project-management/method-overview.html
```text
Method overview
HERMES project management - big picture
The outcome diagram (Figure 1) provides a rough big picture for the outcomes of HERMES project management.
Figure 1: Overview of the HERMES modules and the essential outcomes along the phases
HERMES is an outcome-oriented process method; the focus is on the outcomes. The overview shows the essential outcomes of the individual modules along the phases as well as the rough dependencies and interrelationships. The oval iteration arrows in red symbolize the core of the iteration, the driving character of the product and IT system modules during agile development. The outcomes of the other modules are developed in sync with that iteration, likewise iteratively and incrementally.
What is HERMES project management?
HERMES project management is the holistic management method for carrying out projects and programs of various types in many fields of activity, such as organization adjustment, IT, and service and product development. As Figure 2 shows, HERMES portfolio management, HERMES project management, and HERMES application management are method components of equal value and jointly form the HERMES method.
Figure 2: The three top method components of the HERMES method
HERMES project management supports the steering, management, and execution of projects and accompanies the further development of organizational structures, products and services, IT and logistics systems, infrastructures, etc. with various levels of complexity and different features. A project can be divided into subprojects that deal with different aspects of the same project (e.g. subprojects for users, creators, operators for organization, IT, legal bases). Long-term or complex projects do not necessarily have to be structured as programs. They can be carried out as projects with implementation units.
As a method, HERMES project management has a clear, easy-to-understand structure with common terminology for all participants, has a modular design, and can be expanded. It is continuously updated and further developed.
The other two, equally positioned method components - portfolio management and application management - are not dealt with in detail in HERMES project management.
Project sizes supported by HERMES
To ensure the completeness of the information and the method as such, HERMES project management is designed for major projects of high complexity. This is not an appropriate fit for every project, however. With the sizing function provided in HERMES online, the standard scenarios are adjusted according to the actually determined project value. The project value is determined from a combination of factors such as lead time, size of the project team, stakeholder structure, and political urgency, all of which relate to the complexity of the underlying solution option according to the study. Based on the determined value of the envisaged project, the sizing function provides the project manager with the selected, appropriately tailored scenario together with adapted document templates.
The project sizes/values set in HERMES online should be seen as general standard assumptions. They can be adapted by the project management or core organization as needed.
Use of HERMES project management in practice
The HERMES project management method supports two approaches: The traditional phased approach as described in systems engineering, hereinafter referred to as "traditional", and the iterative and incremental approach, hereinafter referred to as "agile". The method provides a framework that makes it possible to embed different approaches and the corresponding project-specific methods in a uniform way.
Figure 3 shows the functional use of the HERMES project management method, illustrates the prerequisites for the project roles involved in carrying out the project, and shows how the application of the method requires other relevant methodological training or at least sound project practice: The project management method channels knowledge acquired in different areas, enhances it with HERMES-specific elements and terminology, and provides a homogeneous framework for all projects.
Figure 3: How HERMES project management works in practice
HERMES courses and certifications strengthen the required competence and expertise. This ensures the same manner of reporting and communication both within the project and in relation to the core organization, while at the same time meeting the accompanying framework requirements of HERMES project management (see Section 7, e.g. Governance). In this way, projects of all types can be anchored uniformly within the core organization, exhibiting the same level of integration into the operational processes regardless of the selected approach.
The project teams are supported in applying the approach selected for the project and in delivering the outcomes required by the project management method in a lean manner. This does not curtail the traditional and agile methods, but additional, binding method components are required and defined with regard to roles, tasks, or outcomes. The HERMES framework lays a structure over the selected approach that provides a uniform picture of all projects externally and communicates the same language internally to all project participants. This makes the selected project approach completely autonomous as such, so that it can be integrated into any organization.
Independently of the project type or approach, both planning and controlling are largely done in the same way. This also applies to methods supported in principle by HERMES, such as SAFe and the process-based optimization approach DevOps.
The interfaces of HERMES project management
HERMES project management covers the entire project life cycle and is outcome-oriented. It guarantees the compatibility of its standardized interfaces within the project and with the core organization, such as reporting, regardless of whether development is carried out in a traditional or agile manner.
HERMES terminology guarantees a common language and understanding between the core and project organizations, between the project and the program, and between project, application, and portfolio management.
Within the project organization, the project sponsor, project management, and user representative are the indispensable roles for the functioning of the interfaces, but also for the project as a whole. The project sponsor steers the project and has the overall responsibility for the project and for achievement of the project objectives. The project management manages and coordinates the project and determines its course. The user representative is responsible for solution development.
Agile development management with HERMES
The HERMES project management method is a project approach shell into which a specific agile development method can be inserted like a black box. HERMES does not go into any further detail on the development approach encapsulated in this way, but it does define relevant interfaces for the purpose of steering, management, communication, and reporting. These are the corresponding outcomes and specific roles.
The traditional and agile development processes have a fundamentally different understanding of the management of the roles of the hierarchy level of execution. While the traditional approach assumes that the project manager issues work orders, in the agile approach the work of the development team is steered by the user representative via the solution requirements, and the team organizes its work independently. The project manager manages the project, but the project manager is not allowed to interfere with the self-organization of the agile development team. As the representative of the agile development team, the user representative is the contact person for the project manager.
The terminology within agile development is not prescribed; it depends on the development method used in each case. Only the outcome interfaces and the terminology within the framework of project management are defined.
HERMES project management gives the project its uniform structure and a uniform framework. The focus is on the project life cycle; agile development management forms a black box as an encapsulated method. Agile development management determines the organization and steering of the development team and autonomously steers solution development within a predefined framework. The method-specific role models, processes, and rituals can be put into practice without interference - provided there is consensus within the core and project organization.
Positioning of program management
In organizations with far-reaching and comprehensive changes, a holistic management system is required to achieve objectives within a group of interrelated projects in a lean and coordinated manner. This management system is called program management and is an extension of project management. In program management, the projects are grouped together as part of a program.
Projects and programs can be managed side by side in a core organization. Figure 4 shows an example of a portfolio with traditionally and agilely managed projects and a program that includes other projects. The figure shows that a project can be stand-alone or part of a program. A program contains several projects. Projects and programs can be combined within a portfolio.
Figure 4: Simultaneous management of projects and programs in a core organization
HERMES project management creates a common understanding of project and program management. A prerequisite, however, is that the project partners involved in program management have the necessary skills to perform their role successfully. The extension of project management by program management is discussed in the appendix to this reference manual.
User information
The user information describes specific aspects of HERMES project management. User information forms the basis for a deeper understanding of the method, for example in relation to governance and sustainability. User information also shows how HERMES should be applied in specific situations and helps to reduce room for interpretation, for example in hybrid development or when using implementation units.
```
### Text Content from https://www.hermes.admin.ch/en/project-management/method-overview/preface.html
```text
Preface
"Small deeds done are better than great deeds planned."
Agile methods have proven superior to traditional approaches in many areas of our fast-moving times. It therefore makes sense that they are also being used more frequently by the public authorities and are reflected in HERMES. However, the experience of the Swiss Federal Audit Office (SFAO) shows that consistent application of a method is unfortunately no guarantee for successful project implementation. Other aspects are also important. We therefore encourage you to keep the following in mind:
Any transformation depends on cultural change.
From the outset, raise the awareness of everyone involved that innovation is not driven by technology alone, but rather starts with the individual employee. Encourage a willingness to engage in dialogue, learn to live with uncertainty, question taboos, and allow for errors. A zero-error culture is fatal - not only, but especially for the agile world.
Focus on the business and the end user.
As the project sponsor, steer the project by focusing on the expected business benefits and by ensuring that reporting is consistently aligned with those benefits. For example, use milestones to define when you want to realize which benefit and leave project execution primarily to the project team.
With regard to the Administration's transformation plans, do not hesitate to question existing organizations and processes. Motivate those involved to develop the solution together with the users. In the case of the Administration, users include citizens, companies, subsidy recipients, but also cantons and communes. Dare to ask everyone involved to work together so that a continuous end-to-end process is ultimately created.
Assemble the puzzle pieces in your plan without any gaps.
Orchestrate your projects in such a way that they jointly make a valuable contribution to achieving your strategic objectives. Involve architecture, ICS,* and security officers at an early stage so that their requirements are actually taken into account. Finally, make sure you have sufficient explicit test cases for the internal controls and security elements and that they are automated to the extent possible.
Provide your organization with the necessary powers.
Secure key resources in a timely and sustainable manner and unambiguously confirm their role-specific responsibilities. Make sure that the user representative (product owner) has both the expertise and the necessary decision-making powers, and never start without a mature quality and risk management system.
We will examine these aspects during our audits in the Federal Administration, and we look forward to exploring this new world together with all users. If you have any questions, please contact us at info@efk.admin.ch.
Swiss Federal Audit Office SFAO
www.efk.admin.ch
New clothes for HERMES
This 2022 edition of HERMES project management reflects the evolving understanding of projects in recent years and the expectations of users with respect to advanced project management. One of the goals is for the agile development approach in HERMES project management to be adapted to the current needs of the organizations. For this purpose, the already existing agile approach should be optimized and integrated into the phase model - taking into account governance, a uniform approach in the projects, and the proven interfaces to the project environment. A further goal is to give greater weight to aspects such as organization and business focus, while further reducing the heavy emphasis on IT.
HERMES distinguishes between traditional and hybrid project management. With hybrid project management, HERMES now allows various agile development methods to be integrated in a uniform manner. Otherwise, HERMES offers the same structural system and the same method components as before. The basic outlines of the method also remain the same - only with a greater focus on outcomes, which is why the sequence of sections has been modified, in some cases with new headings.
The specific terminology for HERMES has also been kept largely the same, irrespective of the development approach. The traditional development process corresponds to the currently widespread practice of making project management more business-centric. Agile development now provides for the option of approving interim releases, which gives project sponsors an additional opportunity to determine the next step in the same way as a phase release, helping to further safeguard governance.
Other important adjustments:
* The project phases take into account the requirements of the agile world.
* The focus is on project management; agile development management is subordinate as a method and is integrated as a black box without going into further detail.
* The project already starts with a lean initiation phase; the scenario selection comes into play only with the decision on next steps.
* The procurement process is already planned and prepared during initiation - in that way, it facilitates adaptation scenarios.
* The steering function of the milestones is strengthened. The milestones are now tangible as method components and apply independently of the selected approach.
* The tasks now include a definition of which available outcomes form the prerequisite for their execution.
* Roles that must be filled at a minimum are project sponsor, project management, and user representative, which must be filled by the user partner group.
* Management and specialist competencies are clearly and unambiguously set out and separated from each other on a role-specific basis. The project management no longer needs specialist knowledge, but all the more relevant management knowledge and skills. The project management can therefore be recruited externally by the user partner group. The role of the user representative has in turn become more important; the user representative has specialist product responsibility (traditional and agile). The requirements for the role holder have also increased accordingly.
As in previous editions, this manual provides a basis for projects that tend to be large. However, project-specific application of the method is expected (tailoring). Using individually adaptable sizing, the scope of the documents can be specified online. The goal is to keep the complexity of the approach as low as possible and to further increase the user-friendliness of HERMES project management.
We hope that the new HERMES meets your expectations, and we look forward to your feedback.
HERMES is a successful product and we want it to remain so in future.
```

---

## Prompt 3 : /concepts/concept-phases

### Instructions pour tester sur NuExtract.ai

1. Aller sur https://nuextract.ai
2. Créer un nouveau projet ou utiliser le projet existant
3. Utiliser l'API `/api/projects/{projectId}/infer-text` ou l'interface web
4. Coller le prompt complet ci-dessous

### Prompt complet

## Block: /concepts/concept-phases
### Extraction Instructions
- Produce a synthetic text (overview) covering:
- Lifecycle (project start, solution development, project end)
- Traditional vs agile approaches (Execution not subdivided in agile)
- Uniformity of interfaces, milestones/quality gates, releases
- Hierarchy and order (1, 2, 2.1, 2.2, 2.3, 3), role Initiation/Closure
- Target length: 600-1500 words, factual style and faithful to source
- Integrate salient points useful for AI for context and articulation
### Text Content from https://www.hermes.admin.ch/en/project-management/phases.html
```text
Phases
Introduction
Project life cycle
With its phase model, the HERMES project management method supports both the traditional and the agile approach. The phase model for projects is based on the life cycle of the project. For all project participants, it creates the prerequisite for a common understanding of the project process. The phases determine the project structure.
Figure 12 shows the HERMES project life cycle.
Figure 12: HERMES project life cycle
The HERMES project life cycle is divided into project start, solution development, and project end:
* The project start is where the envisaged project is aligned with visions, needs, and objectives. Not infrequently, the focus is on both an urgent need for action as well as external influences (legislators, policymaking and politics, international agreements, association rules, etc.) or superordinate entities (core organization, program, or portfolio).
* The solution development according to the traditional or agile approach is carried out on the basis of the execution release.
* The project end concludes the current project in organizational and formal terms and prepares the transition to the application organization.
Project start
The initiation phase is always situated at the project start. Figure 13 shows the initiation process with the most important outcomes.
Figure 13: Outcome diagram of the initiation phase
During initiation, the requisite project-specific foundations and the possible solution options are elaborated, compared, and evaluated. The choice of solution option includes the decision as to whether the development approach should be agile or traditional. This decision must be justified in terms of the subject matter and process and should not merely follow current trends. The proposed approach is derived from the premises available to the project and is shaped by the selected solution option.
Solution development
The solution development process differs depending on whether a traditional or agile approach is adopted. Most of the method components are almost identical under both approaches; what differs is the project organization and the structure of the project, and consequently the development process and ultimately also the specialist and formal content of the outcomes.
In agile development management, changes are a fundamental part of the development process. The development team follows the given and desired impact and proactively responds to changing requirements instead of following a fixed plan. Development and deployment are iterative and incremental. A phase structure does not make sense under this approach. For that reason, the execution phase cannot be further subdivided.
Depending on which approach is selected, the solution development of the project after execution release is either
* traditional
with the phases of concept , implementation , and deployment , or
* agile
solely with an execution phase
and then concluded with the closure phase, irrespective of the approach taken.
The interfaces to the core organization remain largely the same, as do the documents required at project closure.
Project end
The closure phase is always situated at the project end. It is the last phase of each project, during which the project is conclusively brought to completion. The closest attention during this phase is paid to the project documentation, which is checked accordingly and supplemented and structured as necessary, especially from a formal point of view. The organizational and administrative transition from the project organization to the application organization is also set out during this phase; legacy systems are deactivated or removed, all project data is archived in accordance with the provisions of the core organization and, if necessary, responsibility for the solution is transferred.
The purpose of the closure phase is, in particular, to ensure that the organizational and administrative handover and transition interfaces of the project (vis-à-vis the core organization, the program, the portfolio, the application organization, if necessary the operating organization, etc.) remain identical regardless of the approach selected.
Phase overview
HERMES phase model
Because different types of projects in different core organizations at various hierarchical and decision-making levels may be carried out using both the traditional and agile approaches, the HERMES phase model must be able to handle a correspondingly high level of requirements. Figure 14 illustrates the phase model for projects with traditional and agile approaches.
Figure 14: HERMES phase model for traditional and agile approaches
The phase model
* always reflects the same project structure vis-à-vis the core organization and provides uniform interfaces,
* covers the common controlling and reporting requirements of management,
* fully integrates into a traditional or agile core organization, regardless of the approach chosen,
* makes use of synergies and avoids any redundancies, and
* is easy to apply.
The table shows the phase model using traditional and agile development processes:
Table 1: HERMES phases for projects with traditional and agile solution developmentHERMES phases Traditional developmentProject life cycleHERMES phases agile developmentInitiationProject startInitiationConceptSolution developmentExecutionImplementationDeploymentClosureProject endClosure
Uniform project structure
The first and last phases of the project are always common to all projects. A project begins with the initiation phase and ends with the closure phase. This ensures the uniformity of the project structure and the project life cycle. The project interfaces to the core organization, controlling, program, portfolio, etc. are kept the same regardless of the approach. The transitions to the application organization and operating organization are channeled in a uniform way.
The project structure is supported additionally by the milestones described in Section 4. Over the course of the project, they mark important decision outcomes of project steering and management. As shown in Figure 15, milestones are at the beginning and end of each phase. With each phase release, the (financial, personnel, infrastructure) resources are released for the next phase by the sponsor. Under the agile approach, interim releases can be defined and approved on an optional basis as milestones during the execution phase.
Figure 15: Milestones at the beginning and end of each phase and approval of interim releases
These milestones defined in terms of the project structure correspond to quality gates, before which the outcomes and the procedure are decided. Compliance with the requirements and the conformity of the project with the strategic objectives of the core organization are checked.
Phase progression
The initiation phase provides a basis for planning and steering the project. The initiation phase is followed by solution development, either with the traditional phases of concept, implementation, and deployment or with the agile phase of execution. The execution phase covers the agile development process and serves to embed any agile development method within the HERMES framework.
The closure phase provides space for all necessary measures in connection with the removal of the replaced legacy product or system environment, including the infrastructure that is no longer required, and for the systematic shutting down of the project, including all administrative and organizational measures.
Along the phases, further decisions are made with corresponding specific milestones that determine the successful progression of the project. These milestones vary depending on the nature of the project. As an example, Figure 16 shows the steering and management milestones for traditional and agile IT development projects.
Figure 16: Milestones for traditional and agile IT development projects
For the next steps milestone, but also for other milestones, achievement of the sustainability goals (see Section 7) is also taken into account as an assessment criterion.
Over the course of the entire project, reporting is carried out in accordance with the requirements of the core organization in terms of the content and, to the extent feasible, the frequency of the reports (see Section 7).
Explanation regarding the phase description
For each phase, a phase description is provided that is always structured in the same way:
* Description of the phase as a whole, highlighted
* Enumeration of important points and rough description of what needs to be done over the course of the phase
* Description of the phase closure, highlighted
Explanation of the phases
Project start
* Initiation
Traditional solution development
* Concept
* Implementation
* Deployment
Agile solution development
* Execution
Project end
* Closure
```

---

## Prompt 4 : /concepts/concept-phases/phases

### Instructions pour tester sur NuExtract.ai

1. Aller sur https://nuextract.ai
2. Créer un nouveau projet ou utiliser le projet existant
3. Utiliser l'API `/api/projects/{projectId}/infer-text` ou l'interface web
4. Coller le prompt complet ci-dessous

### Prompt complet

## Block: /concepts/concept-phases/phases
### Extraction Instructions
- Extract phase information from the specific phase page
- Extract base information: name, hierarchical order, type
- Extract main description explaining main objective, role in project lifecycle, and foundations created
- Extract context explaining how phase integrates in lifecycle, relationship with other phases, importance in HERMES2022 methodology
- Identify and list main outcomes (results): documents produced, decisions taken, foundations established
- Identify control points and milestones: phase release decisions, required validations, success criteria
- Determine supported approaches as array: ["traditional"], ["agile"], or ["traditional", "agile"] if both are supported.
- Output: plain text (no rich Markdown). Site language. Factual, neutral style, without extrapolation
- Extract only information present on the page
- Respect JSON structure defined in schema
- Maintain coherence with validation schema
- Prioritize precision over quantity of information
### Text Content from https://www.hermes.admin.ch/en/project-management/phases/initiation.html
```text
Initiation
The initiation phase is carried out in any case, regardless of the approach subsequently chosen. It creates a defined starting position for possible solution development and the subsequent project closure. It ensures that the set objectives are aligned with the organization's requirements. The project foundations and execution order are drawn up.
* Based on the project initiation order, the project sponsor releases the resources for the initiation phase. The project sponsor commissions the project manager to carry out the initiation phase.
* From the perspective of project management, the initiation phase is always handled using the traditional approach. Agile tools can nevertheless also be used.
* The study is compiled.
* The work starts with an initial status report, objectives, and rough requirements.
* The solution options are drawn up. The solution options are described in such detail that they can be evaluated in a comprehensible and transparent manner.
* The project and operational risks are determined.
* In parallel with the study, the legal basis analysis and the protection needs analysis are drawn up and included in the decision.
* It is further defined and documented in a comprehensible manner how to proceed within the framework of each solution option: either traditional or agile.
* The decision on next steps is made.
* A procurement analysis is carried out in parallel to the study for any procurement of a product or a system.
* The scenario suitable for the solution development is selected and customized as needed.
* Based on the chosen option and the approach, the project management plan and execution order are drawn up and compared with the strategies, specifications, and overriding objectives of the core organization. Stakeholder interests are analyzed and conflicts of interest are resolved.
* If an agile approach is taken, it is set out whether the optional decision on release is required in the project.
* The decision on execution release is made and the execution order is signed. The release is carried out by the core organization and the sponsor.
At the end of the initiation phase, a check is carried out to see whether it is wise to release the project; if so, the decision on execution release is made. Possible reasons for termination include lack of economic efficiency, excessive risks, infeasibility, legal or political concerns, and lack of alignment with the objectives, strategies, and priorities of the organization.
```
### Text Content from https://www.hermes.admin.ch/en/project-management/phases/concept.html
```text
Concept
The option chosen in the initiation phase is fleshed out. The outcomes are drawn up in such detail that those involved in the project can plan, offer, and implement the solution based on reliable foundations.
* Based on the selected option and the initial status report from the study, situation analyses are carried out.
* Based on the findings from the situation analyses, the requirements from the study are fleshed out, completed, and newly defined as solution requirements.
* In organizational and IT projects or if business processes or structures are affected by the solution, the organizational requirements and subsequently the organization concept must be drawn up in every case.
* The solution is developed conceptually. The feasibility, where applicable only of individual solution components, is tested, e.g. with prototypes.
* The deployment concept is designed in preparation for deployment.
* Depending on the scenario, a test concept and migration concept are designed.
* In IT projects, the solution architecture and the operating concept are also designed. The decision on solution architecture is made.
* If a solution is to be procured, the call for tenders is issued, the tenders are evaluated, and the selected product or system is procured.
* For systems, the integration concept is designed.
* The implementation release decision is made (decide on phase release).
* The project and operational risks must be identified, analyzed, and evaluated.
* Feasibility of the solution development must still be proven or confirmed.
* The resources for the next phase are released based on the fleshed out project management plan and the offers available.
At the end of the concept phase, a check is carried out to see whether it is wise to implement the project. Possible reasons for termination include economic inefficiency, excessive risks, infeasibility, and lack of alignment with the objectives and strategies of the organization.
```
### Text Content from https://www.hermes.admin.ch/en/project-management/phases/deployment.html
```text
Deployment
The deployment phase ensures a safe transition to the new state. Operation is launched.
* The deployment measures such as user training, etc., are carried out.
* Depending on the scenario, a migration is performed.
* The product or system and the organization are activated.
* Operation is activated.
* The ISDP concept is transferred.
* During the initial period of operation between the launch of operation and the acceptance of the complete system or product, the project supports problem analysis and resolution (after which the warranty begins, and with it regular operation).
* The decision on closure phase release is made. The resources for the closure phase are released based on the updated project management plan.
At the end of the deployment phase, the decision on acceptance is made and the phase is closed once the operation has been successfully launched.
```
### Text Content from https://www.hermes.admin.ch/en/project-management/phases/implementation.html
```text
Implementation
The product or system is implemented and tested. The necessary preparatory work is done to minimize the deployment risks.
The product or system is developed or, if procured, parameterized or adapted.
* The organization is implemented.
* In IT projects, the IT system is integrated into the operating infrastructure.
* Preliminary acceptance is carried out.
* The operating organization is implemented and the documentation is prepared.
* Deployment is prepared on the basis of the deployment concept.
* Depending on the scenario, tests are carried out and migration is prepared.
* The deployment release decision is made (decide on phase release). It is based on the preliminary acceptance decision. The resources for the next phase are released based on the fleshed out project management plan.
At the end of the implementation phase, the deployment risks must be assessed and be acceptable. Otherwise, deployment cannot take place.
```
### Text Content from https://www.hermes.admin.ch/en/project-management/phases/execution.html
```text
Execution
The option selected in the initiation phase is executed iteratively and incrementally. The project organization, including the development team, is established. The solution requirements are further divided, refined, and fleshed out. The requirements are updated, prioritized, and processed (developed, realized, and put into operation) in descending order of priority; priorities are updated continuously and adjusted according to project findings.
* Based on the selected option and the initial status report from the study, situation analyses are carried out.
* With the findings from the situation analyses, the requirements from the study are fleshed out, completed, and defined as prioritized initial solution requirements.
* If the envisaged solution affects business processes or structures, the organizational requirements must be drawn up in every case.
* If a solution is to be procured, the call for tenders is issued, the offers are evaluated, and the selected product or system is procured.
* With each iteration, a further part of the solution - the increment - is created, which can be seamlessly connected to the already created scope of execution results.
Iterative and incremental execution:
* Each individual solution requirement is continuously fleshed out, refined, completed, and divided and prioritized to such an extent that they can be processed in descending order of priority.
* The organization concept is drawn up and the successively emerging organization is realized and documented.
* The project, operational, and deployment risks are identified, analyzed, evaluated, and assessed. Feasibility is checked.
* The product is developed or adapted or the system is developed or parameterized.
* In parallel, the operating organization and all other outcomes of the remaining modules are successively developed, realized, and documented.
* For systems, the integration concept is designed and the decision on solution architecture is made.
* For systems, tests are designed and conducted, migration is prepared and carried out, and the system is integrated into the operating infrastructure.
* The deployment concept is designed and the preliminary acceptance, deployment measures such as user training etc., and the launch of operation are carried out.
* The organization, the relevant part of the solution (one or more increments), and the operation are activated.
* During the initial period of operation until the acceptance of the part of the solution, the project supports problem analysis and resolution (after which the warranty begins, and with it regular operation).
* If so defined in the project management plan, the decision on approval of the next release is made (decide on release).
* The decision on closure phase release is made. The resources for the closure phase are released based on the updated project management plan.
After the completed launch of operation including the acceptance of the last release, the agile part of the project and the execution phase are completed; the development team is dissolved into the project organization.
```
### Text Content from https://www.hermes.admin.ch/en/project-management/phases/closure.html
```text
Closure
The closure phase provides a structure for the systematic shutting down of a project. Project documentation is checked and amended as needed. The project closure is prepared.
* From the perspective of project management, the closure phase is always handled using the traditional approach. Agile tools can nevertheless also be used.
* The outcomes are checked for completeness and amended, in particular from a formal perspective.
* The final project evaluation is checked and approved as appropriate.
* The project organization is dissolved. Before the dissolution, it can be checked whether parts of the project organization can be transferred analogously to the application organization.
* The outcomes, documentation, etc., are transferred to the core organization, specifically the application, operating, and maintenance organization. In IT projects, this also applies to the test infrastructure, including the test concept and the tools.
* The documentation of the project execution, including the outcomes of the approach, is archived according to the filing rules of the core organization.
* Depending on the scenario and taking the specifications into account, the legacy system is decommissioned and removed, including the old, no longer required infrastructure, and the legacy data is archived or destroyed.
At the end of the closure phase, the project closure is carried out. The final project evaluation is prepared. Open points are transferred to the core organization and the application organization. The project is closed and the project organization is dissolved.
```

---


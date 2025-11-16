// Helper pour mocker https.request avec scénarios conditionnels
// Alternative à MSW sans dépendances externes
// Architecture modulaire : mock par hostname pour meilleure maintenabilité

/**
 * Mock pour hermes.admin.ch (fetch HTML)
 * @param {string} scenario - 'success' | 'networkError'
 * @returns {Function} Mock function pour https.request
 */
function mockHermesHtml(scenario = 'success') {
  return (options, callback) => {
    const { path } = options;
    
    // === Scénario : Erreur réseau ===
    if (scenario === 'networkError') {
      const mockRequest = {
        on: jest.fn((event, handler) => {
          if (event === 'error') {
            setImmediate(() => {
              const error = new Error('Network error: ECONNREFUSED');
              error.code = 'ECONNREFUSED';
              handler(error);
            });
          }
          return mockRequest;
        }),
        setTimeout: jest.fn(),
        end: jest.fn(),
        write: jest.fn()
      };
      return mockRequest;
    }
    
    // === Scénario : Succès ===
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head><title>HERMES - ${path}</title></head>
      <body>
        <main>
          <div class="container__main">
            <h1>HERMES 2022 - ${path}</h1>
            <div class="vertical-spacing">
              <p>HERMES is a project management method developed by the Swiss Federal Government.</p>
              <p>It provides a comprehensive framework for managing projects of all sizes.</p>
              <p>The method covers the entire project lifecycle from initiation to closure.</p>
            </div>
          </div>
        </main>
      </body>
      </html>
    `;
    
    const dataHandlers = [];
    const endHandlers = [];
    
    const mockResponse = {
      statusCode: 200,
      on: jest.fn((event, handler) => {
        if (event === 'data') dataHandlers.push(handler);
        if (event === 'end') endHandlers.push(handler);
        return mockResponse;
      })
    };
    
    callback(mockResponse);
    
    setImmediate(() => {
      dataHandlers.forEach(handler => handler(htmlContent));
      endHandlers.forEach(handler => handler());
    });
    
    return {
      on: jest.fn(),
      setTimeout: jest.fn(),
      end: jest.fn(),
      write: jest.fn()
    };
  };
}

/**
 * Mapping des données mockées par JSON Pointer de bloc
 * Structure basée sur hermes2022-concepts.json
 */
const mockDataByBlock = {
  '/config': {
    extractionSource: {
      baseUrl: 'https://www.hermes.admin.ch/en',
      language: 'en',
      description: 'HERMES2022 project management method from Swiss Federal Government'
    }
  },
  
  '/method': {
    hermesVersion: '2022',
    publicationDate: '2023-04-01',
    overview: 'HERMES is a project management method developed by the Swiss Federal Government for steering and managing projects.'
    // extractionModel sera ajouté par normalizeEnumValues()
  },
  
  '/concepts': {
    overview: 'HERMES is a project management method developed by the Swiss Federal Government. It provides a comprehensive framework for managing projects of all sizes. The method covers the entire project lifecycle from initiation to closure. HERMES supports traditional, agile, and hybrid approaches with flexible configuration capabilities. The methodology emphasizes outcome-focused project management with structured phases, scenarios, modules, tasks, results, and roles. '.repeat(2)
    // extractionModel sera ajouté par normalizeEnumValues()
  },
  
  '/concepts/concept-phases': {
    overview: 'HERMES phases structure the project lifecycle from initiation to closure. Traditional projects use all phases sequentially. Agile projects may adapt the execution phase. The phase hierarchy follows: 1=Initiation (project start), 2=Execution (development with 2.1=Concept, 2.2=Implementation, 2.3=Deployment), 3=Closure (project end). '.repeat(3)
    // NOTA: `phases` est un bloc séparé `/concepts/concept-phases/phases`
    // extractionModel sera ajouté par normalizeEnumValues()
  },
  
  // Bloc séparé pour l'array des phases (extraction récursive)
  '/concepts/concept-phases/phases': [
    { id: 'ph_init001', name: 'Initiation', order: '1', type: 'simple', description: 'Project start phase with initial planning and setup activities', context: 'First phase establishing project foundations', outcomes: ['Project charter', 'Initial plan'], milestones: ['Project approved'], approach: ['traditional', 'agile'] },
    { id: 'ph_exec002', name: 'Execution', order: '2', type: 'composite', description: 'Development phase including concept, implementation, and deployment', context: 'Core project execution with iterative development', outcomes: ['Working solution', 'Documentation'], milestones: ['Concept complete', 'Implementation complete', 'Deployment complete'], approach: ['traditional', 'agile'] },
    { id: 'ph_conc003', name: 'Concept', order: '2.1', type: 'simple', description: 'Concept definition within execution phase', context: 'Solution architecture and design', outcomes: ['Architecture document', 'Design specifications'], milestones: ['Design approved'], approach: ['traditional'] },
    { id: 'ph_impl004', name: 'Implementation', order: '2.2', type: 'simple', description: 'Implementation activities within execution phase', context: 'Development and construction of solution', outcomes: ['Implemented solution', 'Test results'], milestones: ['Implementation complete'], approach: ['traditional'] },
    { id: 'ph_depl005', name: 'Deployment', order: '2.3', type: 'simple', description: 'Deployment activities within execution phase', context: 'Solution rollout and stabilization', outcomes: ['Deployed solution', 'Training materials'], milestones: ['Solution deployed'], approach: ['traditional'] },
    { id: 'ph_clos006', name: 'Closure', order: '3', type: 'simple', description: 'Project end phase with final activities and handover', context: 'Project completion and lessons learned', outcomes: ['Final report', 'Lessons learned'], milestones: ['Project closed'], approach: ['traditional', 'agile'] }
    // extractionModel sera ajouté par normalizeEnumValues() pour chaque phase
  ]
};

/**
 * Mock pour nuextract.ai (API NuExtract)
 * @param {string} scenario - 'success' | 'error500' | 'dataNull'
 * @returns {Function} Mock function pour https.request
 */
function mockNuExtractApi(scenario = 'success') {
  return (options, callback) => {
    const { path, method } = options;
    console.log(`[MOCK NUEXTRACT] Called with path=${path}, method=${method}, scenario=${scenario}`);
    
    let statusCode = 200;
    let responseData = {};
    let requestBody = ''; // Accumulateur pour le body de la requête
    
    // === Endpoints NuExtract ===
    
    // GET /api/projects - Liste des projets
    if (path === '/api/projects' && method === 'GET') {
      responseData = [{ 
        id: 'project-123', 
        name: 'HERMES2022', 
        description: 'Test project' 
      }];
    }
    
    // POST /api/projects - Création de projet
    else if (path === '/api/projects' && method === 'POST') {
      responseData = { 
        id: 'project-new-456', 
        name: 'HERMES2022', 
        description: 'Test project' 
      };
    }
    
    // POST /api/infer-template - Génération template (sync)
    else if (path === '/api/infer-template' && method === 'POST') {
      responseData = { 
        hermesVersion: 'string', 
        overview: 'string' 
      };
    }
    
    // POST /api/infer-template-async - Génération template (async)
    else if (path.includes('/api/infer-template-async')) {
      responseData = { jobId: 'job-789' };
    }
    
    // GET /api/jobs/{jobId} - Statut job
    else if (path.includes('/api/jobs/')) {
      responseData = {
        status: 'completed',
        outputData: { hermesVersion: 'string', overview: 'string' }
      };
    }
    
    // PUT /api/projects/{projectId}/template - Mise à jour template
    else if (path.includes('/template') && method === 'PUT') {
      responseData = { success: true };
    }
    
      // POST /api/projects/{projectId}/infer-text - Extraction de données
      else if (path.includes('/infer-text') && method === 'POST') {
        // Scénarios spéciaux
        if (scenario === 'error500') {
          statusCode = 500;
          responseData = { error: 'Internal Server Error' };
        }
        else if (scenario === 'dataNull') {
          // Retourner un JSON valide avec result: null pour simuler data null
          responseData = { result: null };
        }
      else {
        // Succès : responseData sera déterminé après parsing du requestBody
        // Le requestBody contient {"text": "## Block: /method\n..."} 
        // On doit extraire le JSON Pointer et retourner les données correspondantes
        responseData = null; // Sera défini dans le callback end()
      }
    }
    
    // Créer la réponse mockée
    const dataHandlers = [];
    const endHandlers = [];
    
    const mockResponse = {
      statusCode,
      on: jest.fn((event, handler) => {
        if (event === 'data') dataHandlers.push(handler);
        if (event === 'end') endHandlers.push(handler);
        return mockResponse;
      })
    };
    
    callback(mockResponse);
    
    const mockRequest = {
      on: jest.fn(),
      setTimeout: jest.fn(),
      end: jest.fn((cb) => {
        // Traitement asynchrone de la réponse
        setImmediate(() => {
          // Pour /infer-text avec succès, parser le requestBody pour extraire le JSON Pointer
          if (path.includes('/infer-text') && scenario === 'success' && responseData === null) {
            try {
              // Parser le body JSON : {"text": "## Block: /method\n..."}
              const body = JSON.parse(requestBody);
              
              // Extraire le JSON Pointer depuis le texte
              const blockMatch = body.text.match(/##\s*Block:\s*(\/[^\s\n]+)/);
              
              if (!blockMatch) {
                throw new Error('[MOCK ERROR] Could not extract JSON Pointer from request body');
              }
              
              const jsonPointer = blockMatch[1];
              
              // Lookup dans le mapping
              if (!mockDataByBlock[jsonPointer]) {
                throw new Error(`[MOCK ERROR] Unknown block: ${jsonPointer}. Available blocks: ${Object.keys(mockDataByBlock).join(', ')}`);
              }
              
              responseData = mockDataByBlock[jsonPointer];
              
              // Log explicite avec type de données
              const dataType = Array.isArray(responseData) ? 'array' : typeof responseData;
              console.log(`[MOCK DEBUG] Block ${jsonPointer} → Type: ${dataType}, Length: ${Array.isArray(responseData) ? responseData.length : 'N/A'}`);
            } catch (err) {
              // En cas d'erreur, retourner une erreur explicite
              console.error('[MOCK ERROR]', err.message);
              responseData = { error: err.message };
              statusCode = 500;
            }
          }
          
          // Envoyer la réponse
          const dataString = responseData !== null 
            ? JSON.stringify(responseData) 
            : '';
          
          if (dataString) {
            dataHandlers.forEach(handler => handler(dataString));
          }
          endHandlers.forEach(handler => handler());
          
          // Callback optionnel de end()
          if (cb) setImmediate(cb);
        });
        return mockRequest;
      }),
      write: jest.fn((data) => {
        requestBody += data;
        return true;
      })
    };
    
    return mockRequest;
  };
}

/**
 * Mock pour api.anthropic.com (API Claude)
 * @param {string} scenario - 'success' | 'error429'
 * @returns {Function} Mock function pour https.request
 */
function mockClaudeApi(scenario = 'success') {
  return (options, callback) => {
    const { path, method } = options;
    
    let statusCode = 200;
    let responseData = {};
    
    // POST /v1/messages - API Claude
    if (path === '/v1/messages' && method === 'POST') {
      if (scenario === 'error429') {
        statusCode = 429;
        responseData = {
          type: 'error',
          error: {
            type: 'rate_limit_error',
            message: 'Rate limit exceeded. Please try again later.'
          }
        };
      }
      else {
        responseData = {
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [{ 
            text: JSON.stringify({ 
              hermesVersion: '2022', 
              overview: 'HERMES method' 
            }) 
          }],
          model: 'claude-3-sonnet-20240229',
          stop_reason: 'end_turn',
          usage: { input_tokens: 100, output_tokens: 50 }
        };
      }
    }
    
    // Créer la réponse mockée
    const dataHandlers = [];
    const endHandlers = [];
    
    const mockResponse = {
      statusCode,
      on: jest.fn((event, handler) => {
        if (event === 'data') dataHandlers.push(handler);
        if (event === 'end') endHandlers.push(handler);
        return mockResponse;
      })
    };
    
    callback(mockResponse);
    
    setImmediate(() => {
      const dataString = JSON.stringify(responseData);
      dataHandlers.forEach(handler => handler(dataString));
      endHandlers.forEach(handler => handler());
    });
    
    return {
      on: jest.fn(),
      setTimeout: jest.fn(),
      end: jest.fn(),
      write: jest.fn()
    };
  };
}

/**
 * Fonction orchestratrice qui dispatche vers le bon mock selon hostname
 * @param {Object} scenarios - Scénarios par système : { hermes: 'success', nuextract: 'error500', claude: 'success' }
 * @returns {Function} Mock function pour https.request
 */
function createHttpsMock(scenarios = {}) {
  // Scénarios par défaut
  const defaultScenarios = {
    hermes: 'success',
    nuextract: 'success',
    claude: 'success'
  };
  
  const activeScenarios = { ...defaultScenarios, ...scenarios };
  
  return (options, callback) => {
    const { hostname } = options;
    
    // Dispatch selon hostname
    if (hostname === 'www.hermes.admin.ch') {
      return mockHermesHtml(activeScenarios.hermes)(options, callback);
    }
    else if (hostname === 'nuextract.ai') {
      return mockNuExtractApi(activeScenarios.nuextract)(options, callback);
    }
    else if (hostname === 'api.anthropic.com') {
      return mockClaudeApi(activeScenarios.claude)(options, callback);
    }
    
    throw new Error(`Unexpected hostname in mock: ${hostname}`);
  };
}

module.exports = {
  createHttpsMock,
  mockHermesHtml,
  mockNuExtractApi,
  mockClaudeApi
};

const http = require('http');

function testAPI() {
    const postData = JSON.stringify({
        professionalId: '68c228f1deeca35f76a4cb86',
        serviceId: '68d01adbe4267f9e8dd35e69',
        date: '2025-09-22T08:00:00.000Z',
        time: '09:00',
        clientName: 'Teste',
        clientLastName: 'Silva',
        clientPhone: '(83) 99999-9999'
    });

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/public/appointments',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    console.log('🧪 Testando API de agendamentos...');

    const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            try {
                const result = JSON.parse(data);
                console.log('📊 Resposta da API:', result);
                
                if (result.success) {
                    console.log('✅ Teste bem-sucedido!');
                } else {
                    console.log('❌ Erro na API:', result.message);
                }
            } catch (error) {
                console.error('💥 Erro ao parsear resposta:', error.message);
                console.log('📄 Resposta raw:', data);
            }
        });
    });

    req.on('error', (error) => {
        console.error('💥 Erro na requisição:', error.message);
    });

    req.write(postData);
    req.end();
}

testAPI();

-- Troca o ícone genérico (public/placeholders) dos produtos do catálogo
-- inicial por uma foto real do produto (public/produtos), casando pelo nome.
-- A origem de cada foto está em prisma/product-photos.json.
--
-- Nunca sobrescreve uma foto enviada pela loja: só atualiza produtos sem
-- nenhuma imagem ou cuja primeira imagem ainda é o ícone genérico. Produtos
-- com outro nome (ou que não existem neste banco) simplesmente não mudam.

UPDATE "products" SET "images" = ARRAY['/produtos/album-do-bebe.webp'], "updated_at" = NOW()
WHERE "name" = 'Álbum do Bebê' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/babador-impermeavel-kit-c-3.webp'], "updated_at" = NOW()
WHERE "name" = 'Babador Impermeável Kit c/3' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/banheira-inflavel.webp'], "updated_at" = NOW()
WHERE "name" = 'Banheira Inflável' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/bebe-conforto.webp'], "updated_at" = NOW()
WHERE "name" = 'Bebê Conforto' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/body-manga-curta.webp'], "updated_at" = NOW()
WHERE "name" = 'Body Manga Curta' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/body-manga-longa.webp'], "updated_at" = NOW()
WHERE "name" = 'Body Manga Longa' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/bolsa-maternidade-grande.webp'], "updated_at" = NOW()
WHERE "name" = 'Bolsa Maternidade Grande' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/cadeira-de-alimentacao.webp'], "updated_at" = NOW()
WHERE "name" = 'Cadeira de Alimentação' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/canguru-ergonomico.webp'], "updated_at" = NOW()
WHERE "name" = 'Canguru Ergonômico' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/carrinho-de-bebe.webp'], "updated_at" = NOW()
WHERE "name" = 'Carrinho de Bebê' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/casaco-de-frio.webp'], "updated_at" = NOW()
WHERE "name" = 'Casaco de Frio' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/comoda-com-trocador.webp'], "updated_at" = NOW()
WHERE "name" = 'Cômoda com Trocador' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/conjunto-blusa-e-calca.webp'], "updated_at" = NOW()
WHERE "name" = 'Conjunto Blusa e Calça' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/cortador-de-unha-bebe.webp'], "updated_at" = NOW()
WHERE "name" = 'Cortador de Unha Bebê' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/cortina-blackout.webp'], "updated_at" = NOW()
WHERE "name" = 'Cortina Blackout' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/esterilizador.webp'], "updated_at" = NOW()
WHERE "name" = 'Esterilizador' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/frasqueira-termica.webp'], "updated_at" = NOW()
WHERE "name" = 'Frasqueira Térmica' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/guarda-roupa-infantil.webp'], "updated_at" = NOW()
WHERE "name" = 'Guarda-roupa Infantil' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/kit-banho-completo.webp'], "updated_at" = NOW()
WHERE "name" = 'Kit Banho Completo' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/kit-berco-nuvem.webp'], "updated_at" = NOW()
WHERE "name" = 'Kit Berço Nuvem' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/kit-chupetas.webp'], "updated_at" = NOW()
WHERE "name" = 'Kit Chupetas' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/kit-higiene-banho.webp'], "updated_at" = NOW()
WHERE "name" = 'Kit Higiene Banho' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/kit-higiene-completo.webp'], "updated_at" = NOW()
WHERE "name" = 'Kit Higiene Completo' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/kit-mamadeiras.webp'], "updated_at" = NOW()
WHERE "name" = 'Kit Mamadeiras' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/kit-manta-rosa.webp'], "updated_at" = NOW()
WHERE "name" = 'Kit Manta Rosa' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/kit-pratinhos.webp'], "updated_at" = NOW()
WHERE "name" = 'Kit Pratinhos' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/luminaria-noturna.webp'], "updated_at" = NOW()
WHERE "name" = 'Luminária Noturna' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/macacao-plush.webp'], "updated_at" = NOW()
WHERE "name" = 'Macacão Plush' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/macacao-tricot.webp'], "updated_at" = NOW()
WHERE "name" = 'Macacão Tricot' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/manta-de-tricot.webp'], "updated_at" = NOW()
WHERE "name" = 'Manta de Tricot' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/manta-soft-azul.webp'], "updated_at" = NOW()
WHERE "name" = 'Manta Soft Azul' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/meias-kit-c-3.webp'], "updated_at" = NOW()
WHERE "name" = 'Meias Kit c/3' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/mobile-musical.webp'], "updated_at" = NOW()
WHERE "name" = 'Móbile Musical' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/mochila-maternidade.webp'], "updated_at" = NOW()
WHERE "name" = 'Mochila Maternidade' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/mordedor.webp'], "updated_at" = NOW()
WHERE "name" = 'Mordedor' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/necessaire-maternidade.webp'], "updated_at" = NOW()
WHERE "name" = 'Nécessaire Maternidade' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/ninho-percy.webp'], "updated_at" = NOW()
WHERE "name" = 'Ninho Percy' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/ninho-redutor.webp'], "updated_at" = NOW()
WHERE "name" = 'Ninho Redutor' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/organizador-de-carrinho.webp'], "updated_at" = NOW()
WHERE "name" = 'Organizador de Carrinho' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/pijama-algodao.webp'], "updated_at" = NOW()
WHERE "name" = 'Pijama Algodão' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/porta-chupeta.webp'], "updated_at" = NOW()
WHERE "name" = 'Porta Chupeta' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/protetor-de-berco.webp'], "updated_at" = NOW()
WHERE "name" = 'Protetor de Berço' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/quadro-decorativo-kit-c-3.webp'], "updated_at" = NOW()
WHERE "name" = 'Quadro Decorativo Kit c/3' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/saboneteira.webp'], "updated_at" = NOW()
WHERE "name" = 'Saboneteira' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/saida-de-maternidade-luxo.webp'], "updated_at" = NOW()
WHERE "name" = 'Saída de Maternidade Luxo' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/saida-de-maternidade-simples.webp'], "updated_at" = NOW()
WHERE "name" = 'Saída de Maternidade Simples' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/sombrinha-para-carrinho.webp'], "updated_at" = NOW()
WHERE "name" = 'Sombrinha para Carrinho' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/termometro-de-banho.webp'], "updated_at" = NOW()
WHERE "name" = 'Termômetro de Banho' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/toalha-com-capuz.webp'], "updated_at" = NOW()
WHERE "name" = 'Toalha com Capuz' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');

UPDATE "products" SET "images" = ARRAY['/produtos/trocador-portatil.webp'], "updated_at" = NOW()
WHERE "name" = 'Trocador Portátil' AND (cardinality("images") = 0 OR "images"[1] LIKE '/placeholders/%');
